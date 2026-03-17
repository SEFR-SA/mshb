import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Download, Forward, ZoomIn, ZoomOut, Copy, Link, MoreHorizontal, X, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ImageViewerProps {
  src: string;
  alt?: string;
  onClose: () => void;
  senderName?: string;
  senderAvatar?: string;
  timestamp?: string;
  fileName?: string;
  fileSize?: string;
  onForward?: () => void;
}

const ImageViewer = ({
  src,
  alt,
  onClose,
  senderName,
  senderAvatar,
  timestamp,
  fileName,
  fileSize,
  onForward,
}: ImageViewerProps) => {
  const { t } = useTranslation();
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState<string>("center");

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    if (!isZoomed) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomOrigin(`${x}% ${y}%`);
      setIsZoomed(true);
    } else {
      setIsZoomed(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || alt || "image";
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
      const res = await fetch(src);
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
    navigator.clipboard.writeText(src);
    toast({ title: t("imageViewer.copiedToClipboard") });
  };

  const handleImageDetails = () => {
    const parts = [];
    if (fileName) parts.push(`${t("imageViewer.filename")}: ${fileName}`);
    if (fileSize) parts.push(`${t("imageViewer.size")}: ${fileSize}`);
    toast({ title: t("imageViewer.viewDetails"), description: parts.join(" · ") || src });
  };

  const btnClass =
    "p-2 rounded-md hover:bg-white/15 text-white/70 hover:text-white transition-colors disabled:opacity-40";

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center"
        onClick={onClose}
      >
        {/* Top bar */}
        <div
          className="absolute top-8 left-0 right-0 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left: sender info */}
          <div className="flex items-center gap-2 min-w-0">
            {(senderName || senderAvatar) && (
              <>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={senderAvatar || ""} />
                  <AvatarFallback className="bg-white/10 text-white text-xs">
                    {(senderName || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {senderName && (
                  <span className="font-medium text-white text-sm truncate">{senderName}</span>
                )}
              </>
            )}
            {timestamp && (
              <span className="text-xs text-zinc-400 shrink-0">{timestamp}</span>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={btnClass}
                  onClick={() => window.open(src, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="z-[10000] text-xs">
                {t("imageViewer.openInBrowser", "Open in browser")}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className={btnClass} onClick={handleSave}>
                  <Download className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="z-[10000] text-xs">
                {t("imageViewer.save")}
              </TooltipContent>
            </Tooltip>

            {onForward && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className={btnClass} onClick={onForward}>
                    <Forward className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="z-[10000] text-xs">
                  {t("imageViewer.forward")}
                </TooltipContent>
              </Tooltip>
            )}

            {!isZoomed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className={btnClass} onClick={() => setIsZoomed(true)}>
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="z-[10000] text-xs">
                  {t("imageViewer.zoomIn")}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className={btnClass} onClick={() => setIsZoomed(false)}>
                    <ZoomOut className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="z-[10000] text-xs">
                  {t("imageViewer.zoomOut")}
                </TooltipContent>
              </Tooltip>
            )}

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button className={btnClass}>
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8} className="z-[10000] text-xs">
                  {t("actions.more", "More")}
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent side="bottom" align="end" className="z-[10000] min-w-[180px]">
                <DropdownMenuItem onClick={handleCopyImage}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t("imageViewer.copyImage")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link className="h-4 w-4 mr-2" />
                  {t("imageViewer.copyLink")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleImageDetails}>
                  <Info className="h-4 w-4 mr-2" />
                  {t("imageViewer.viewDetails")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-4 bg-white/20 mx-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <button className={btnClass} onClick={onClose}>
                  <X className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="z-[10000] text-xs">
                {t("actions.cancel")}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Image area */}
        <div
          className="flex items-center justify-center w-full h-full overflow-hidden"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <img
            src={src}
            alt={alt || fileName || "image"}
            onClick={handleImageClick}
            style={{ transformOrigin: zoomOrigin }}
            className={`max-w-[90vw] max-h-[85vh] object-contain transition-transform duration-300 ease-out select-none ${
              isZoomed ? "cursor-zoom-out scale-[2.5]" : "cursor-zoom-in scale-100"
            }`}
            draggable={false}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ImageViewer;
