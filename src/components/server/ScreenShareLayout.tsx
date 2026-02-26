import React, { useRef, useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Monitor, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import ScreenShareViewer from "./ScreenShareViewer";

// ─────────────────────────────────────────────────────────────────────────────
// Small video thumbnail for the stream selector tab
// ─────────────────────────────────────────────────────────────────────────────
const StreamThumb = ({ stream }: { stream: MediaStream }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      className="w-12 h-7 object-contain rounded bg-black flex-shrink-0"
    />
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ScreenShareLayout — wraps ScreenShareViewer with multi-stream selector
// ─────────────────────────────────────────────────────────────────────────────
interface ScreenShareLayoutProps {
  channelName: string;
  serverId: string;
  onStopWatching: () => void;
  height?: string;
}

interface Participant {
  user_id: string;
  displayName: string;
}

const ScreenShareLayout = ({ channelName, serverId, onStopWatching, height }: ScreenShareLayoutProps) => {
  const { t } = useTranslation();
  const {
    voiceChannel,
    remoteScreenStreams,
    watchedSharerUserId,
    setWatchedSharerUserId,
  } = useVoiceChannel();

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);

  // Fetch voice channel participants to resolve display names
  useEffect(() => {
    if (!voiceChannel?.id) return;
    supabase
      .from("voice_channel_participants" as any)
      .select("user_id, profiles:user_id(display_name, username)")
      .eq("channel_id", voiceChannel.id)
      .then(({ data }) => {
        if (!data) return;
        setParticipants(
          (data as any[]).map((p) => ({
            user_id: p.user_id,
            displayName: p.profiles?.display_name || p.profiles?.username || "User",
          }))
        );
      });
  }, [voiceChannel?.id]);

  // Subscribe to participant changes
  useEffect(() => {
    if (!voiceChannel?.id) return;
    const ch = supabase
      .channel(`layout-participants-${voiceChannel.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "voice_channel_participants",
        filter: `channel_id=eq.${voiceChannel.id}`,
      }, () => {
        supabase
          .from("voice_channel_participants" as any)
          .select("user_id, profiles:user_id(display_name, username)")
          .eq("channel_id", voiceChannel.id)
          .then(({ data }) => {
            if (!data) return;
            setParticipants(
              (data as any[]).map((p) => ({
                user_id: p.user_id,
                displayName: p.profiles?.display_name || p.profiles?.username || "User",
              }))
            );
          });
      })
      .subscribe();
    return () => { ch.unsubscribe(); };
  }, [voiceChannel?.id]);

  // Nothing to show
  if (remoteScreenStreams.size === 0) return null;

  // Build list of active sharers
  const sharers = Array.from(remoteScreenStreams.entries()).map(([userId, stream]) => {
    const p = participants.find(x => x.user_id === userId);
    return { userId, stream, sharerName: p?.displayName ?? "User" };
  });

  // Auto-select: use watchedSharerUserId if valid, otherwise fall back to first
  const effectiveId = (watchedSharerUserId && remoteScreenStreams.has(watchedSharerUserId))
    ? watchedSharerUserId
    : sharers[0]?.userId ?? null;
  const activeSharer = sharers.find(s => s.userId === effectiveId) ?? sharers[0];

  if (!activeSharer) return null;

  // Minimized state — slim bar
  if (isMinimized) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-black/90 border-b border-border/50 text-white text-sm">
        <Monitor className="h-4 w-4 text-green-400 shrink-0" />
        <span className="truncate">{activeSharer.sharerName} · {t("streaming.live")}</span>
        {sharers.length > 1 && (
          <span className="text-xs text-white/50 shrink-0">+{sharers.length - 1}</span>
        )}
        <button
          onClick={() => setIsMinimized(false)}
          className="ml-auto px-2 py-0.5 bg-white/10 hover:bg-white/20 rounded text-xs transition-colors shrink-0"
        >
          {t("streaming.restore")}
        </button>
        <button
          onClick={onStopWatching}
          className="p-1 hover:bg-white/20 rounded transition-colors shrink-0"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Stream selector — only shown when 2+ users are sharing */}
      {sharers.length > 1 && (
        <div className="flex items-center gap-1.5 px-3 py-2 bg-black/90 border-b border-white/10 overflow-x-auto">
          {sharers.map(({ userId, stream, sharerName }) => (
            <button
              key={userId}
              onClick={() => setWatchedSharerUserId(userId)}
              className={cn(
                "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm transition-colors shrink-0",
                effectiveId === userId
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/10 text-white/70 hover:bg-white/20"
              )}
            >
              <StreamThumb stream={stream} />
              <span className="truncate max-w-[100px] font-medium">{sharerName}</span>
              <span className="bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded leading-none shrink-0">
                {t("streaming.live")}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main viewer */}
      <ScreenShareViewer
        stream={activeSharer.stream}
        sharerName={activeSharer.sharerName}
        channelName={channelName}
        height={height}
        onStopWatching={onStopWatching}
        onMinimize={() => setIsMinimized(true)}
      />
    </div>
  );
};

export default ScreenShareLayout;
