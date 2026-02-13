import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ZoomIn, ZoomOut, Forward, Download, Copy, MoreHorizontal, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ForwardImageDialog from "./ForwardImageDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ImageViewerProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  onClose: () => void;
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ImageViewer = ({ fileUrl, fileName, fileType, fileSize, onClose }: ImageViewerProps) => {
  const { t } = useTranslation();
  const [zoom, setZoom] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [forwardOpen, setForwardOpen] = useState(false);

  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const handleSave = async () => {
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const handleCopyImage = async () => {
    try {
      const res = await fetch(fileUrl);
      const blob = await res.blob();
      const pngBlob =
        blob.type === "image/png"
          ? blob
          : await new Promise<Blob>((resolve) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                const canvas = document.createElement("canvas");
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.getContext("2d")!.drawImage(img, 0, 0);
                canvas.toBlob((b) => resolve(b!), "image/png");
              };
              img.src = URL.createObjectURL(blob);
            });
      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      toast({ title: t("imageViewer.copiedToClipboard") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fileUrl);
    toast({ title: t("imageViewer.copiedToClipboard") });
  };

  const btnClass =
    "p-2 rounded-md hover:bg-white/10 text-white/80 hover:text-white transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90">
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#2b2d31] rounded-lg px-2 py-1 shadow-lg z-10">
        <button onClick={zoomIn} className={btnClass} title={t("imageViewer.zoomIn")}>
          <ZoomIn className="h-5 w-5" />
        </button>
        <button onClick={zoomOut} className={btnClass} title={t("imageViewer.zoomOut")}>
          <ZoomOut className="h-5 w-5" />
        </button>

        <div className="w-px h-5 bg-white/20 mx-1" />

        <button onClick={() => setForwardOpen(true)} className={btnClass} title={t("imageViewer.forward")}>
          <Forward className="h-5 w-5" />
        </button>
        <button onClick={handleSave} className={btnClass} title={t("imageViewer.save")}>
          <Download className="h-5 w-5" />
        </button>

        <div className="w-px h-5 bg-white/20 mx-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={btnClass}>
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[180px]">
            <DropdownMenuItem onClick={handleCopyImage}>
              <Copy className="h-4 w-4 mr-2" />
              {t("imageViewer.copyImage")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyLink}>
              <Copy className="h-4 w-4 mr-2" />
              {t("imageViewer.copyLink")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowDetails((v) => !v)}>
              {t("imageViewer.viewDetails")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-5 bg-white/20 mx-1" />

        <button onClick={onClose} className={btnClass} title={t("actions.cancel")}>
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center w-full overflow-hidden cursor-pointer"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        onWheel={handleWheel}
      >
        <img
          src={fileUrl}
          alt={fileName}
          className="max-w-[90vw] max-h-[85vh] object-contain transition-transform duration-150"
          style={{ transform: `scale(${zoom})` }}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* View Details Panel */}
      {showDetails && (
        <div className="absolute bottom-6 left-6 bg-[#2b2d31] rounded-lg p-4 shadow-lg text-white/90 min-w-[220px] z-10">
          <p className="text-xs text-white/50 mb-1">{t("imageViewer.filename")}</p>
          <p className="text-sm font-medium truncate mb-3">{fileName}</p>
          <p className="text-xs text-white/50 mb-1">{t("imageViewer.size")}</p>
          <p className="text-sm font-medium">{formatFileSize(fileSize)}</p>
        </div>
      )}

      {/* Forward dialog */}
      <ForwardImageDialog
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        fileUrl={fileUrl}
        fileName={fileName}
        fileType={fileType}
        fileSize={fileSize}
      />
    </div>
  );
};

export default ImageViewer;
