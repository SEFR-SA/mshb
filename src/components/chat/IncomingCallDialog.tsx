import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Phone, PhoneOff } from "lucide-react";

interface IncomingCallDialogProps {
  callerName: string;
  callerAvatar?: string;
  onAccept: () => void;
  onDecline: () => void;
}

const IncomingCallDialog = ({ callerName, callerAvatar, onAccept, onDecline }: IncomingCallDialogProps) => {
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Play ringtone
    const audio = new Audio("/notification.mp3");
    audio.loop = true;
    audio.play().catch(() => {});
    audioRef.current = audio;

    // Auto-dismiss after 30s
    const timeout = setTimeout(() => {
      onDecline();
    }, 30000);

    return () => {
      audio.pause();
      audio.currentTime = 0;
      clearTimeout(timeout);
    };
  }, [onDecline]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl p-6 shadow-xl flex flex-col items-center gap-4 min-w-[280px]">
        <Avatar className="h-16 w-16">
          <AvatarImage src={callerAvatar || ""} />
          <AvatarFallback className="bg-primary/20 text-primary text-xl">
            {callerName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className="font-semibold text-lg">{callerName}</p>
          <p className="text-sm text-muted-foreground">{t("calls.incoming")}</p>
        </div>
        <div className="flex gap-4">
          <Button
            onClick={onDecline}
            variant="destructive"
            size="lg"
            className="rounded-full h-14 w-14"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>
          <Button
            onClick={() => {
              audioRef.current?.pause();
              onAccept();
            }}
            className="rounded-full h-14 w-14 bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            <Phone className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallDialog;
