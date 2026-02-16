import React, { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneOff, Mic, MicOff, Volume2, HeadphoneOff, Monitor, MonitorOff, Video, VideoOff, PictureInPicture2, Maximize, Minimize } from "lucide-react";
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
  isCameraOn?: boolean;
  localCameraStream?: MediaStream | null;
  remoteCameraStream?: MediaStream | null;
  onStartCamera?: () => void;
  onStopCamera?: () => void;
}

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const VideoElement = ({ stream, showPiP, label, className }: { stream: MediaStream; showPiP?: boolean; label?: string; className?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    wrapper.addEventListener("fullscreenchange", handler);
    return () => wrapper.removeEventListener("fullscreenchange", handler);
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
    } else if (wrapperRef.current) {
      await wrapperRef.current.requestFullscreen();
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className || ""}`}>
      {label && <p className="text-xs text-muted-foreground text-center mb-1">{label}</p>}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full max-h-[400px] rounded-lg bg-black object-contain"
      />
      <audio ref={audioRef} autoPlay className="hidden" />
      {showPiP && (
        <div className="absolute top-2 end-2 flex gap-1">
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 opacity-70 hover:opacity-100"
            onClick={handleFullscreen}
            title={isFullscreen ? t("calls.exitFullScreen") : t("calls.fullScreen")}
          >
            {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="secondary"
            size="icon"
            className="h-7 w-7 opacity-70 hover:opacity-100"
            onClick={handlePiP}
            title={t("calls.pip")}
          >
            <PictureInPicture2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
};

const SelfView = ({ stream }: { stream: MediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="absolute bottom-2 end-2 z-10">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-[120px] h-[90px] rounded-lg bg-black object-cover border-2 border-border/50"
      />
    </div>
  );
};

const VoiceCallUI = ({ callState, isMuted, isDeafened, callDuration, otherName, otherAvatar, onEndCall, onToggleMute, onToggleDeafen, isScreenSharing, remoteScreenStream, onStartScreenShare, onStopScreenShare, isCameraOn, localCameraStream, remoteCameraStream, onStartCamera, onStopCamera }: VoiceCallUIProps) => {
  const { t } = useTranslation();

  if (callState === "idle" || callState === "ended") return null;

  const initial = (otherName || "?").charAt(0).toUpperCase();

  return (
    <div className="relative flex flex-col items-center justify-center gap-4 py-8 bg-card/80 backdrop-blur-sm border-b border-border/50 min-h-[200px]">
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
            <div className="w-full px-4">
              <VideoElement stream={remoteScreenStream} showPiP label={t("calls.userSharing", { name: otherName })} />
            </div>
          )}

          {/* Remote camera */}
          {remoteCameraStream && (
            <div className="w-full px-4 max-w-[300px]">
              <VideoElement stream={remoteCameraStream} showPiP label={t("calls.userCamera", { name: otherName })} className="rounded-xl overflow-hidden" />
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
            {onStartCamera && onStopCamera && (
              <Button
                variant={isCameraOn ? "secondary" : "ghost"}
                size="icon"
                className="h-10 w-10 rounded-full"
                onClick={isCameraOn ? onStopCamera : onStartCamera}
                title={isCameraOn ? t("calls.stopCamera") : t("calls.startCamera")}
              >
                {isCameraOn ? <VideoOff className="h-5 w-5 text-green-500" /> : <Video className="h-5 w-5" />}
              </Button>
            )}
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

          {/* Self-view overlay */}
          {localCameraStream && <SelfView stream={localCameraStream} />}
        </>
      )}
    </div>
  );
};

export default VoiceCallUI;
