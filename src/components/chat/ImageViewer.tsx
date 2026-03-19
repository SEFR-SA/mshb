import React, { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Download, Forward, ZoomIn, ZoomOut, Copy, Link, MoreHorizontal, X, Info } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { copyImageToClipboard, saveImageAs } from "@/lib/imageClipboard";
import { copyToClipboard } from "@/lib/utils";
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
import { useMountEffect } from "@/hooks/useMountEffect";

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

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SCALE_STEP = 0.5;

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

  const [scale, setScale] = useState(MIN_SCALE);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mouseDownPos = useRef({ x: 0, y: 0 });

  const zoomIn = useCallback(() => {
    setScale(s => Math.min(s + SCALE_STEP, MAX_SCALE));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(s => {
      const next = Math.max(s - SCALE_STEP, MIN_SCALE);
      if (next <= MIN_SCALE) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const resetView = useCallback(() => {
    setScale(MIN_SCALE);
    setPosition({ x: 0, y: 0 });
  }, []);

  const handleClose = useCallback((e?: React.MouseEvent) => {
    if (e) {
      const dx = e.clientX - mouseDownPos.current.x;
      const dy = e.clientY - mouseDownPos.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) return;
    }
    resetView();
    onClose();
  }, [onClose, resetView]);

  // Keyboard shortcuts
  useMountEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      else if (e.key === "+" || e.key === "=") zoomIn();
      else if (e.key === "-") zoomOut();
      else if (e.key === "0") resetView();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  // Scroll wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  // --- Drag-to-pan handlers (on container, not just img) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    mouseDownPos.current = { x: e.clientX, y: e.clientY };
    if (scale <= MIN_SCALE) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= MIN_SCALE) return;
    e.preventDefault();
    e.stopPropagation();
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) e.stopPropagation();
    setIsDragging(false);
  };

  // Utility handlers
  const handleSave = async () => {
    const ok = await saveImageAs(src, fileName || alt || "image");
    if (!ok) toast({ title: t("common.error"), variant: "destructive" });
  };

  const handleCopyImage = async () => {
    const ok = await copyImageToClipboard(src);
    toast({
      title: ok ? t("imageViewer.copiedToClipboard", "Copied to clipboard") : t("common.error"),
      variant: ok ? undefined : "destructive",
    });
  };

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(src);
    toast({
      title: ok ? t("imageViewer.copiedToClipboard", "Copied to clipboard") : t("common.error"),
      variant: ok ? undefined : "destructive",
    });
  };

  const handleImageDetails = () => {
    const parts = [];
    if (fileName) parts.push(`${t("imageViewer.filename")}: ${fileName}`);
    if (fileSize) parts.push(`${t("imageViewer.size")}: ${fileSize}`);
    toast({ title: t("imageViewer.viewDetails"), description: parts.join(" · ") || src });
  };

  const isZoomed = scale > MIN_SCALE;
  const btnClass = "p-2 rounded-md hover:bg-white/15 text-white/70 hover:text-white transition-colors disabled:opacity-40";

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center"
        onClick={(e) => handleClose(e)}
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
                <button className={btnClass} onClick={zoomIn} disabled={scale >= MAX_SCALE}>
                  <ZoomIn className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="z-[10000] text-xs">
                {t("imageViewer.zoomIn", "Zoom In")}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className={btnClass} onClick={zoomOut} disabled={scale <= MIN_SCALE}>
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
                <button className={btnClass} onClick={() => handleClose()}>
                  <X className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8} className="z-[10000] text-xs">
                {t("actions.close", "Close")}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Image area: drag container */}
        <div
          className="relative flex items-center justify-center w-full h-full overflow-hidden"
          style={{ cursor: isZoomed ? (isDragging ? "grabbing" : "grab") : "zoom-in" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose(e);
          }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <img
            src={src}
            alt={alt || fileName || "image"}
            onClick={(e) => {
              e.stopPropagation();
              if (!isZoomed) zoomIn();
            }}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              transition: isDragging ? "none" : "transform 0.2s ease-out",
              pointerEvents: isDragging ? "none" : "auto",
              cursor: isZoomed ? (isDragging ? "grabbing" : "grab") : "zoom-in",
            }}
            className="max-w-[90vw] max-h-[85vh] object-contain select-none"
            draggable={false}
          />
        </div>

        {/* Zoom level badge */}
        {isZoomed && (
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/70 text-white/90 text-xs font-mono pointer-events-none"
          >
            {scale.toFixed(1)}x
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default ImageViewer;
