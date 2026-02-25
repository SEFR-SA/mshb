import React, { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Monitor, PictureInPicture2, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ScreenShareViewerProps {
  stream: MediaStream;
  sharerName: string;
  label?: string;
}

const ScreenShareViewer = ({ stream, sharerName, label }: ScreenShareViewerProps) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    container.addEventListener("fullscreenchange", handler);
    return () => container.removeEventListener("fullscreenchange", handler);
  }, []);

  const handlePiP = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (videoRef.current) {
      await videoRef.current.requestPictureInPicture();
    }
  };

  const handleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (containerRef.current) {
      await containerRef.current.requestFullscreen();
    }
  };

  return (
    <div ref={containerRef} className={cn(
      "flex flex-col bg-background",
      isFullscreen ? "w-screen h-screen" : "border-b border-border"
    )}>
      <div className="flex items-center gap-2 px-4 py-2 bg-card/80 border-b border-border/50">
        <Monitor className="h-4 w-4 text-green-500" />
        <span className="text-sm font-medium flex-1">{label ?? t("calls.userSharing", { name: sharerName })}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleFullscreen}
          title={isFullscreen ? t("calls.exitFullScreen") : t("calls.fullScreen")}
        >
          {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handlePiP}
          title={t("calls.pip")}
        >
          <PictureInPicture2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className={cn(
        "flex items-center justify-center bg-black/90",
        isFullscreen ? "flex-1" : "min-h-[300px] max-h-[500px]"
      )}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className={cn(
            "w-full h-full object-contain",
            !isFullscreen && "max-h-[500px]"
          )}
        />
        <audio ref={audioRef} autoPlay className="hidden" />
      </div>
    </div>
  );
};

export default ScreenShareViewer;
