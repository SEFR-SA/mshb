import React, { useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneOff, Mic, MicOff, Volume2, HeadphoneOff, Monitor, MonitorOff } from "lucide-react";
import type { CallState } from "@/hooks/useWebRTC";

interface VoiceCallUIProps {
  callState: CallState;
  isMuted: boolean;
  isDeafened: boolean;
  callDuration: number;
  otherName: string;
  otherAvatar?: string;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  isScreenSharing?: boolean;
  remoteScreenStream?: MediaStream | null;
  onStartScreenShare?: () => void;
  onStopScreenShare?: () => void;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const ScreenShareVideo = ({ stream }: { stream: MediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);
  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full max-h-[400px] rounded-lg bg-black object-contain"
    />
  );
};

const VoiceCallUI = ({ callState, isMuted, isDeafened, callDuration, otherName, otherAvatar, onEndCall, onToggleMute, onToggleDeafen, isScreenSharing, remoteScreenStream, onStartScreenShare, onStopScreenShare }: VoiceCallUIProps) => {
  const { t } = useTranslation();

  if (callState === "idle" || callState === "ended") return null;

  const initial = (otherName || "?").charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-8 bg-card/80 backdrop-blur-sm border-b border-border/50 min-h-[200px]">
      {callState === "ringing" ? (
        <>
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ width: 88, height: 88, top: -4, left: -4 }} />
            <Avatar className="h-20 w-20 ring-4 ring-primary/30">
              <AvatarImage src={otherAvatar || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">{initial}</AvatarFallback>
            </Avatar>
          </div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            {t("calls.calling")} {otherName}...
          </p>
          <Button variant="destructive" size="lg" className="rounded-full px-6 gap-2" onClick={onEndCall}>
            <PhoneOff className="h-4 w-4" />
            {t("calls.endCall")}
          </Button>
        </>
      ) : (
        <>
          {/* Remote screen share */}
          {remoteScreenStream && (
            <div className="w-full px-4 space-y-1">
              <p className="text-xs text-muted-foreground text-center">{t("calls.userSharing", { name: otherName })}</p>
              <ScreenShareVideo stream={remoteScreenStream} />
            </div>
          )}

          {/* Local sharing indicator */}
          {isScreenSharing && !remoteScreenStream && (
            <p className="text-xs text-green-500 font-medium">{t("calls.youAreSharing")}</p>
          )}

          <div className="relative">
            <Avatar className="h-[72px] w-[72px]">
              <AvatarImage src={otherAvatar || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-xl">{initial}</AvatarFallback>
            </Avatar>
            <span className="absolute bottom-1 end-1 h-3.5 w-3.5 rounded-full bg-green-500 ring-2 ring-card" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">{otherName}</p>
            <p className="text-xs text-green-500 font-medium">{t("calls.connected")}</p>
          </div>
          <p className="text-2xl font-mono tabular-nums tracking-wider">{formatDuration(callDuration)}</p>
          <div className="flex items-center gap-3">
            <Button
              variant={isMuted ? "secondary" : "ghost"}
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={onToggleMute}
              title={isMuted ? t("calls.unmute") : t("calls.mute")}
            >
              {isMuted ? <MicOff className="h-5 w-5 text-destructive" /> : <Mic className="h-5 w-5" />}
            </Button>
            <Button
              variant={isDeafened ? "secondary" : "ghost"}
              size="icon"
              className="h-10 w-10 rounded-full"
              onClick={onToggleDeafen}
              title={isDeafened ? t("audio.undeafen") : t("audio.deafen")}
            >
              {isDeafened ? <HeadphoneOff className="h-5 w-5 text-destructive" /> : <Volume2 className="h-5 w-5" />}
            </Button>
            {onStartScreenShare && onStopScreenShare && (
              <Button
                variant={isScreenSharing ? "secondary" : "ghost"}
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={isScreenSharing ? onStopScreenShare : onStartScreenShare}
                title={isScreenSharing ? t("calls.stopSharing") : t("calls.shareScreen")}
              >
                {isScreenSharing ? <MonitorOff className="h-5 w-5 text-green-500" /> : <Monitor className="h-5 w-5" />}
              </Button>
            )}
            <Button variant="destructive" size="icon" className="h-10 w-10 rounded-full" onClick={onEndCall} title={t("calls.endCall")}>
              <PhoneOff className="h-5 w-5" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceCallUI;
