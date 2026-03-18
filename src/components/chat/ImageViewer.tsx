import React, { useState, useEffect, useCallback } from "react";
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
  const [zoom, setZoom] = useState(1);

  // States for Drag-to-Pan (Grab & Drag)
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const zoomIn = useCallback(() => setIsZoomed(true), []);
  const zoomOut = useCallback(() => {
    setIsZoomed(false);
    setPosition({ x: 0, y: 0 }); // Reset position when unzoomed
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "+" || e.key === "=") zoomIn();
      if (e.key === "-") zoomOut();
    },
    [onClose, zoomIn, zoomOut]
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
      let pngBlob = blob;

      if (blob.type !== "image/png") {
        pngBlob = await new Promise<Blob>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            canvas.getContext("2d")?.drawImage(img, 0, 0);
            canvas.toBlob((b) => {
              if (b) resolve(b);
              else reject(new Error("Conversion failed"));
            }, "image/png");
          };
          img.onerror = () => reject(new Error("Image load failed"));
          img.src = URL.createObjectURL(blob);
        });
      }

      await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
      toast({ title: t("imageViewer.copiedToClipboard", "Copied to clipboard") });
    } catch (err) {
      console.error(err);
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(src);
    toast({ title: t("imageViewer.copiedToClipboard", "Copied to clipboard") });
  };

  const handleImageDetails = () => {
    const parts = [];
    if (fileName) parts.push(`${t("imageViewer.filename")}: ${fileName}`);
    if (fileSize) parts.push(`${t("imageViewer.size")}: ${fileSize}`);
    toast({ title: t("imageViewer.viewDetails"), description: parts.join(" · ") || src });
  };

  // Drag Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault(); // Stop native ghost dragging
    e.stopPropagation(); // SHIELD: Don't close viewer
    if (!isZoomed) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isDragging || !isZoomed) return;
    e.preventDefault();
    e.stopPropagation(); // SHIELD
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation(); // SHIELD
    setIsDragging(false);
  };

  // CLICK SHIELD: Absolute protection. Clicking image will NEVER close viewer.
  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation(); // THIS IS THE ULTIMATE SHIELD!
  };

  const btnClass = "p-2 rounded-md hover:bg-white/15 text-white/70 hover:text-white transition-colors disabled:opacity-40";

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center"
        onClick={onClose} // Only closes when clicking the pure background
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
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
              <span className="text-xs text-white/70 shrink-0">{timestamp}</span>
            )}
          </div>

          {/* Right: action buttons */}
          <div className="flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className={btnClass} onClick={() => window.open(src, "_blank")}>
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
                {t("imageViewer.save", "Save")}
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
                  {t("imageViewer.forward", "Forward")}
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <button className={btnClass} onClick={zoomIn}>
                  <ZoomIn className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="z-[10000] text-xs">
                {t("imageViewer.zoomIn", "Zoom In")}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className={btnClass} onClick={zoomOut}>
                  <ZoomOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="z-[10000] text-xs">
                {t("imageViewer.zoomOut", "Zoom Out")}
              </TooltipContent>
            </Tooltip>

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
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyImage(); }}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t("imageViewer.copyImage", "Copy Image")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}>
                  <Link className="h-4 w-4 mr-2" />
                  {t("imageViewer.copyLink", "Copy Link")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleImageDetails(); }}>
                  <Info className="h-4 w-4 mr-2" />
                  {t("imageViewer.viewDetails", "View Details")}
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
                {t("actions.cancel", "Cancel")}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Image area: Drag Container */}
        <div
          className="relative flex items-center justify-center w-full h-full overflow-hidden"
          onClick={(e) => {
            // ONLY close if the background itself was clicked
            if (e.target === e.currentTarget) onClose();
          }}
          onWheel={handleWheel}
        >
          <img
            src={src}
            alt={alt || fileName || "image"}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleImageClick} // CLICK SHIELD IS HERE
            style={{
              // Use direct translate and scale for smooth drag and zoom without flickering
              transform: `translate(${position.x}px, ${position.y}px) scale(${isZoomed ? 1.5 : 1})`,
              transition: isDragging ? 'none' : 'transform 0.2s ease-in-out',
              // Dynamic Cursors (Hand 🖐️ and Fist ✊)
              cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'default'
            }}
            className="max-w-[90vw] max-h-[85vh] object-contain select-none"
            draggable={false}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ImageViewer;
