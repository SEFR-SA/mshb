import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import type { CallState } from "@/hooks/useWebRTC";

interface VoiceCallUIProps {
  callState: CallState;
  isMuted: boolean;
  callDuration: number;
  otherName: string;
  onEndCall: () => void;
  onToggleMute: () => void;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const VoiceCallUI = ({ callState, isMuted, callDuration, otherName, onEndCall, onToggleMute }: VoiceCallUIProps) => {
  const { t } = useTranslation();

  if (callState === "idle" || callState === "ended") return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 border-b border-border/50">
      <Phone className="h-4 w-4 text-primary animate-pulse" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {callState === "ringing" ? t("calls.calling") : `${otherName} — ${t("calls.connected")}`}
        </p>
        {callState === "connected" && (
          <p className="text-xs text-muted-foreground">{formatDuration(callDuration)}</p>
        )}
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleMute} title={isMuted ? t("calls.unmute") : t("calls.mute")}>
        {isMuted ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}
      </Button>
      <Button variant="destructive" size="icon" className="h-8 w-8" onClick={onEndCall} title={t("calls.endCall")}>
        <PhoneOff className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default VoiceCallUI;
