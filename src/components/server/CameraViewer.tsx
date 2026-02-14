import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Video, PictureInPicture2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraViewerProps {
  stream: MediaStream;
}

const CameraViewer = ({ stream }: CameraViewerProps) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const handlePiP = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (videoRef.current) {
      await videoRef.current.requestPictureInPicture();
    }
  };

  return (
    <div className="flex flex-col bg-background border-b border-border">
      <div className="flex items-center gap-2 px-4 py-2 bg-card/80 border-b border-border/50">
        <Video className="h-4 w-4 text-green-500" />
        <span className="text-sm font-medium flex-1">{t("calls.startCamera")}</span>
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
      <div className="flex items-center justify-center bg-black/90 max-h-[300px]">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-contain max-h-[300px]"
        />
      </div>
    </div>
  );
};

export default CameraViewer;
