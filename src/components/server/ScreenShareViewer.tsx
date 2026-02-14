import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Monitor } from "lucide-react";

interface ScreenShareViewerProps {
  stream: MediaStream;
  sharerName: string;
}

const ScreenShareViewer = ({ stream, sharerName }: ScreenShareViewerProps) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="flex flex-col bg-background border-b border-border">
      <div className="flex items-center gap-2 px-4 py-2 bg-card/80 border-b border-border/50">
        <Monitor className="h-4 w-4 text-green-500" />
        <span className="text-sm font-medium">{t("calls.userSharing", { name: sharerName })}</span>
      </div>
      <div className="flex items-center justify-center bg-black/90 min-h-[300px] max-h-[500px]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain max-h-[500px]"
        />
      </div>
    </div>
  );
};

export default ScreenShareViewer;
