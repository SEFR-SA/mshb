import React, { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Monitor, PictureInPicture2, Maximize, Minimize,
  Mic, MicOff, Video, VideoOff, MonitorOff,
  Volume2, Volume1, VolumeX, Headphones, HeadphoneOff, X,
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
  onStopWatching?: () => void;
}

const ScreenShareViewer = ({ stream, sharerName, channelName, onStopWatching }: ScreenShareViewerProps) => {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isHudVisible, setIsHudVisible] = useState(true);
  const [streamVolume, setStreamVolume] = useState(100);
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);
  const [resolutionLabel, setResolutionLabel] = useState("");

  const { isCameraOn, setIsCameraOn, isScreenSharing, setIsScreenSharing } = useVoiceChannel();
  const { globalMuted, globalDeafened, toggleGlobalMute, toggleGlobalDeafen } = useAudioSettings();

  // Attach stream to video/audio
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
    if (audioRef.current) audioRef.current.srcObject = stream;
  }, [stream]);

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

  // Stream volume control
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = streamVolume / 100;
  }, [streamVolume]);

  // Resolution detection
  useEffect(() => {
    const track = stream.getVideoTracks()[0];
    if (!track) { setResolutionLabel(""); return; }
    const { height, frameRate } = track.getSettings();
    if (!height) { setResolutionLabel(""); return; }
    const res = height >= 1080 ? "1080p" : height >= 720 ? "720p" : height >= 480 ? "480p" : `${height}p`;
    const fps = frameRate ? ` ${Math.round(frameRate)}FPS` : "";
    setResolutionLabel(`${res}${fps}`);
  }, [stream]);

  // Cleanup HUD timer on unmount
  useEffect(() => {
    return () => { if (hudTimerRef.current) clearTimeout(hudTimerRef.current); };
  }, []);

  const handleMouseMove = () => {
    setIsHudVisible(true);
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => setIsHudVisible(false), 3000);
  };

  const handleMouseLeave = () => {
    if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    setIsHudVisible(false);
  };

  const handlePiP = async () => {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (videoRef.current) {
      await videoRef.current.requestPictureInPicture();
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

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative overflow-hidden bg-black select-none",
        isFullscreen ? "w-screen h-screen" : "h-[360px] border-b border-border"
      )}
    >
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-contain"
      />
      <audio ref={audioRef} autoPlay className="hidden" />

      {/* HUD Overlay */}
      <div className={cn(
        "absolute inset-0 z-10 flex flex-col justify-between pointer-events-none",
        "transition-opacity duration-300",
        isHudVisible ? "opacity-100" : "opacity-0"
      )}>

        {/* ── TOP BAR ── */}
        <div className="pointer-events-auto bg-gradient-to-b from-black/70 to-transparent px-4 pt-3 pb-8">
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
            </div>
          </div>
        </div>

        {/* ── BOTTOM SECTION ── */}
        <div className="pointer-events-auto bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">

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
                onClick={() => setIsCameraOn(!isCameraOn)}
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
                onClick={() => setIsScreenSharing(!isScreenSharing)}
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

            {/* Left: Fullscreen + PiP */}
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
            </div>

            {/* Right: Volume */}
            <div
              className="relative"
              onMouseEnter={() => setIsVolumeOpen(true)}
              onMouseLeave={() => setIsVolumeOpen(false)}
            >
              {isVolumeOpen && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10 w-36">
                  <Slider
                    value={[streamVolume]}
                    onValueChange={([v]) => setStreamVolume(v)}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-[10px] text-white/50 text-center mt-1">{streamVolume}%</p>
                </div>
              )}
              <button className="flex items-center gap-1 p-2 bg-black/40 hover:bg-black/60 text-white rounded-lg transition-colors">
                {streamVolume === 0
                  ? <VolumeX className="h-4 w-4" />
                  : streamVolume < 50
                  ? <Volume1 className="h-4 w-4" />
                  : <Volume2 className="h-4 w-4" />}
                <span className="text-xs text-white/60">{streamVolume}%</span>
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ScreenShareViewer;
