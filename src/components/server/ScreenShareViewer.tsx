import React, { useRef, useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { useTranslation } from "react-i18next";
import {
  Monitor, PictureInPicture2, Maximize, Minimize,
  Mic, MicOff, Video, VideoOff, MonitorOff,
  Volume2, Volume1, VolumeX, Headphones, HeadphoneOff, X,
  ExternalLink, ChevronDown, Scaling,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";

interface ScreenShareViewerProps {
  stream: MediaStream;
  sharerName: string;
  label?: string;
  channelName?: string;
  height?: string;
  onStopWatching?: () => void;
  onMinimize?: () => void;
}

const ScreenShareViewer = ({ stream, sharerName, channelName, height, onStopWatching, onMinimize }: ScreenShareViewerProps) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoutVideoRef = useRef<HTMLVideoElement>(null);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preMuteVolumeRef = useRef(100);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const isVolumeOpenRef = useRef(false);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [streamVolume, setStreamVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [resolutionLabel, setResolutionLabel] = useState("");
  const [fitMode, setFitMode] = useState<"contain" | "cover">("contain");
  const [isPopped, setIsPopped] = useState(false);
  const [popPos, setPopPos] = useState({ x: -1, y: -1 }); // -1 = unpositioned (use CSS default)

  const {
    isCameraOn, setIsCameraOn,
    isScreenSharing, setIsScreenSharing,
    localCameraStream, setLocalCameraStream,
  } = useVoiceChannel();
  const { globalMuted, globalDeafened, toggleGlobalMute, toggleGlobalDeafen } = useAudioSettings();

  // Keep ref in sync with state for stale-closure-safe timer check
  useEffect(() => { isVolumeOpenRef.current = isVolumeOpen; }, [isVolumeOpen]);

  // Attach stream to inline video/audio
  useEffect(() => {
    if (!isPopped && videoRef.current) videoRef.current.srcObject = stream;
    if (audioRef.current) audioRef.current.srcObject = stream;
  }, [stream, isPopped]);

  // Attach stream to pop-out video
  useEffect(() => {
    if (isPopped && popoutVideoRef.current) popoutVideoRef.current.srcObject = stream;
  }, [stream, isPopped]);

  // Fullscreen state tracking
  useEffect(() => {
    const handler = () =>
      setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  // Stream volume — responds to both slider and mute toggle
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : streamVolume / 100;
    }
  }, [streamVolume, isMuted]);

  // Resolution detection
  useEffect(() => {
    const track = stream.getVideoTracks()[0];
    if (!track) { setResolutionLabel(""); return; }
    const { height: h, frameRate } = track.getSettings();
    if (!h) { setResolutionLabel(""); return; }
    const res = h >= 1080 ? "1080p" : h >= 720 ? "720p" : h >= 480 ? "480p" : `${h}p`;
    const fps = frameRate ? ` ${Math.round(frameRate)}FPS` : "";
    setResolutionLabel(`${res}${fps}`);
  }, [stream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
      localScreenStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const resetHudTimer = () => {
    setIsHudVisible(true);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => {
      if (!isVolumeOpenRef.current) setIsHudVisible(false);
    }, 3000);
  };

  const handleMouseMove = resetHudTimer;
  const handleMouseLeave = () => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    setIsHudVisible(false);
  };

  const handleVolumeMute = () => {
    if (isMuted) {
      setIsMuted(false);
      setStreamVolume(preMuteVolumeRef.current || 100);
    } else {
      preMuteVolumeRef.current = streamVolume;
      setIsMuted(true);
    }
  };

  const handleCameraToggle = async () => {
    if (isCameraOn) {
      localCameraStream?.getTracks().forEach(t => t.stop());
      setLocalCameraStream(null);
      setIsCameraOn(false);
    } else {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        setLocalCameraStream(s);
        setIsCameraOn(true);
      } catch (err) {
        console.error("Camera error:", err);
      }
    }
  };

  const handleScreenShareToggle = async () => {
    if (isScreenSharing) {
      localScreenStreamRef.current?.getTracks().forEach(t => t.stop());
      localScreenStreamRef.current = null;
      setIsScreenSharing(false);
    } else {
      try {
        const s = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: true });
        localScreenStreamRef.current = s;
        s.getVideoTracks()[0].onended = () => {
          localScreenStreamRef.current = null;
          setIsScreenSharing(false);
        };
        setIsScreenSharing(true);
      } catch (err) {
        console.error("Screen share error:", err);
      }
    }
  };

  const handlePiP = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      const target = isPopped ? popoutVideoRef.current : videoRef.current;
      if (target) await target.requestPictureInPicture();
    }
  };

  const handleFullscreen = async () => {
    try {
      const isInFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      if (isInFullscreen) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) (document as any).webkitExitFullscreen();
      } else if (containerRef.current) {
        if (containerRef.current.requestFullscreen) await containerRef.current.requestFullscreen();
        else if ((containerRef.current as any).webkitRequestFullscreen) (containerRef.current as any).webkitRequestFullscreen();
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  };

  const handlePopoutDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: popPos.x < 0 ? window.innerWidth - 496 : popPos.x,
      origY: popPos.y < 0 ? window.innerHeight - 284 : popPos.y,
    };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      setPopPos({
        x: Math.max(0, Math.min(window.innerWidth - 480, dragRef.current.origX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 270, dragRef.current.origY + dy)),
      });
    };
    const onUp = () => {
      dragRef.current.dragging = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [popPos]);

  // ── Shared HUD bottom-left buttons ─────────────────────────────────────────
  const hudBottomLeft = (
    <div className="flex items-center gap-1.5">
      <button
        onClick={handleFullscreen}
        className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors"
        title={isFullscreen ? t("calls.exitFullScreen") : t("calls.fullScreen")}
      >
        {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </button>
      <button
        onClick={handlePiP}
        className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors"
        title={t("calls.pip")}
      >
        <PictureInPicture2 className="h-4 w-4" />
      </button>
      <button
        onClick={() => setIsPopped(v => !v)}
        className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors"
        title={isPopped ? t("streaming.popOutClose") : t("streaming.popOut")}
      >
        <ExternalLink className="h-4 w-4" />
      </button>
      <button
        onClick={() => setFitMode(m => m === "contain" ? "cover" : "contain")}
        className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors"
        title={fitMode === "contain" ? t("streaming.fillMode") : t("streaming.fitMode")}
      >
        <Scaling className="h-4 w-4" />
      </button>
    </div>
  );

  // ── Shared volume control ──────────────────────────────────────────────────
  const hudVolumeControl = (
    <div
      className="relative"
      onMouseEnter={() => setIsVolumeOpen(true)}
      onMouseLeave={() => setIsVolumeOpen(false)}
    >
      {isVolumeOpen && (
        <div className="absolute bottom-full right-0 bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10 w-36">
          <Slider
            value={[isMuted ? 0 : streamVolume]}
            onValueChange={([v]) => {
              if (isMuted && v > 0) setIsMuted(false);
              setStreamVolume(v);
            }}
            max={100}
            step={1}
            className="w-full"
          />
          <p className="text-[10px] text-white/50 text-center mt-1">
            {isMuted ? 0 : streamVolume}%
          </p>
        </div>
      )}
      <button
        onClick={handleVolumeMute}
        className={cn(
          "flex items-center gap-1 p-2 rounded-lg transition-colors",
          isMuted ? "bg-red-600/70 text-white" : "bg-black/40 hover:bg-black/60 text-white"
        )}
      >
        {isMuted || streamVolume === 0
          ? <VolumeX className="h-4 w-4" />
          : streamVolume < 50
          ? <Volume1 className="h-4 w-4" />
          : <Volume2 className="h-4 w-4" />}
        <span className="text-xs text-white/60">{isMuted ? 0 : streamVolume}%</span>
      </button>
    </div>
  );

  // ── Pop-out floating panel (portal) ───────────────────────────────────────
  const popoutPanel = isPopped ? ReactDOM.createPortal(
    <div
      className="fixed z-[9999] rounded-xl overflow-hidden shadow-2xl border border-white/20 bg-black"
      style={{
        width: 480,
        ...(popPos.x >= 0
          ? { left: popPos.x, top: popPos.y }
          : { right: 16, bottom: 16 }),
      }}
      onMouseMove={resetHudTimer}
      onMouseLeave={handleMouseLeave}
    >
      {/* Drag handle / title bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 bg-black/80 cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handlePopoutDragStart}
      >
        <div className="flex items-center gap-2 text-white/80 text-xs">
          <Monitor className="h-3.5 w-3.5 text-green-400" />
          <span className="truncate max-w-[280px]">{channelName ? `${channelName} · ` : ""}{sharerName}</span>
          <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded leading-none">
            {t("streaming.live")}
          </span>
        </div>
        <button
          onClick={() => setIsPopped(false)}
          className="p-1 hover:bg-white/20 text-white/60 hover:text-white rounded transition-colors"
          title={t("streaming.popOutClose")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Video */}
      <div className="relative aspect-video bg-black">
        <video
          ref={popoutVideoRef}
          autoPlay
          playsInline
          className={cn("absolute inset-0 w-full h-full", fitMode === "contain" ? "object-contain" : "object-cover")}
        />
        {/* Minimal HUD overlay on pop-out */}
        <div className={cn(
          "absolute inset-0 z-10 flex flex-col justify-end pointer-events-none",
          "transition-opacity duration-300",
          isHudVisible ? "opacity-100" : "opacity-0"
        )}>
          <div className={cn(
            "bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-6",
            isHudVisible ? "pointer-events-auto" : "pointer-events-none"
          )}>
            <div className="flex items-center justify-between">
              {hudBottomLeft}
              {hudVolumeControl}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  // ── Inline viewer (collapsed when popped) ─────────────────────────────────
  return (
    <>
      {popoutPanel}
      <audio ref={audioRef} autoPlay className="hidden" />

      {/* When popped, show a slim banner instead of the full viewer */}
      {isPopped ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-black/80 border-b border-border/50 text-white text-sm">
          <Monitor className="h-4 w-4 text-green-400 shrink-0" />
          <span className="truncate">{sharerName} · {t("streaming.live")}</span>
          <span className="text-xs text-white/50 ml-1">({t("streaming.popOut")})</span>
          <button
            onClick={() => setIsPopped(false)}
            className="ml-auto px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors"
          >
            {t("streaming.popOutClose")}
          </button>
          {onStopWatching && (
            <button onClick={onStopWatching} className="p-1 hover:bg-white/20 rounded transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div
          ref={containerRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className={cn(
            "relative overflow-hidden bg-black select-none",
            isFullscreen ? "w-screen h-screen" : (height ?? "h-[480px] max-h-[65vh] border-b border-border")
          )}
        >
          {/* Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={cn(
              "absolute inset-0 w-full h-full",
              fitMode === "contain" ? "object-contain" : "object-cover"
            )}
          />

          {/* HUD Overlay */}
          <div className={cn(
            "absolute inset-0 z-10 flex flex-col justify-between pointer-events-none",
            "transition-opacity duration-300",
            isHudVisible ? "opacity-100" : "opacity-0"
          )}>

            {/* ── TOP BAR ── */}
            <div className={cn(
              "bg-gradient-to-b from-black/70 to-transparent px-4 pt-3 pb-8",
              isHudVisible ? "pointer-events-auto" : "pointer-events-none"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white min-w-0">
                  <Monitor className="h-4 w-4 text-green-400 shrink-0" />
                  {channelName && <span className="text-sm font-semibold truncate">{channelName}</span>}
                  {channelName && <span className="text-white/40 text-xs">·</span>}
                  <span className="text-sm text-white/80 truncate">{sharerName}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {resolutionLabel && (
                    <span className="text-white/70 text-xs font-medium">{resolutionLabel}</span>
                  )}
                  <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded leading-none">
                    {t("streaming.live")}
                  </span>
                  {onMinimize && (
                    <button
                      onClick={onMinimize}
                      className="p-1.5 bg-black/40 hover:bg-black/60 text-white rounded transition-colors"
                      title={t("streaming.minimize")}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── BOTTOM SECTION ── */}
            <div className={cn(
              "bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8",
              isHudVisible ? "pointer-events-auto" : "pointer-events-none"
            )}>

              {/* Center dock */}
              <div className="flex justify-center mb-3">
                <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-md rounded-2xl px-5 py-2.5 border border-white/10">

                  {/* Deafen */}
                  <button
                    onClick={toggleGlobalDeafen}
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      globalDeafened ? "bg-red-600 text-white" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                    title={globalDeafened ? t("calls.undeafen") : t("calls.deafen")}
                  >
                    {globalDeafened ? <HeadphoneOff className="h-4 w-4" /> : <Headphones className="h-4 w-4" />}
                  </button>

                  {/* Mute Mic */}
                  <button
                    onClick={toggleGlobalMute}
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      globalMuted ? "bg-red-600 text-white" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                    title={globalMuted ? t("calls.unmute") : t("calls.mute")}
                  >
                    {globalMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>

                  {/* Camera */}
                  <button
                    onClick={handleCameraToggle}
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      !isCameraOn ? "bg-red-600/70 text-white" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                    title={isCameraOn ? t("calls.stopCamera") : t("calls.startCamera")}
                  >
                    {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </button>

                  {/* Share Screen */}
                  <button
                    onClick={handleScreenShareToggle}
                    className={cn(
                      "p-2 rounded-full transition-colors",
                      isScreenSharing ? "bg-green-600 text-white" : "bg-white/10 text-white hover:bg-white/20"
                    )}
                    title={isScreenSharing ? t("calls.stopSharing") : t("calls.shareScreen")}
                  >
                    {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  </button>

                  {onStopWatching && <div className="w-px h-6 bg-white/20" />}

                  {/* Stop Watching */}
                  {onStopWatching && (
                    <button
                      onClick={onStopWatching}
                      className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-full transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("streaming.stopWatching")}
                    </button>
                  )}
                </div>
              </div>

              {/* Bottom corners */}
              <div className="flex items-center justify-between">
                {hudBottomLeft}
                {hudVolumeControl}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScreenShareViewer;
