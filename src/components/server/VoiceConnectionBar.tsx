import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useLiveKitRoom } from "@/hooks/useLiveKitRoom";
import { serverVoiceRoom } from "@/lib/livekit";

interface VoiceConnectionManagerProps {
  channelId: string;
  channelName: string;
  serverId: string;
  onDisconnect: () => void;
}

/** Headless component — manages LiveKit voice connection with no visible UI */
const VoiceConnectionManager = ({ channelId, channelName, serverId, onDisconnect }: VoiceConnectionManagerProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { globalMuted, globalDeafened, setGlobalMuted, setGlobalDeafened } = useAudioSettings();
  const {
    isScreenSharing, setIsScreenSharing,
    setRemoteScreenStreams,
    isCameraOn, setIsCameraOn,
    setLocalCameraStream, setRemoteCameraStream,
    voiceChannel, setVoiceChannel, setNativeResolutionLabel,
  } = useVoiceChannel();

  const [isJoined, setIsJoined] = useState(false);
  const [inactiveChannelId, setInactiveChannelId] = useState<string | null>(null);
  const [inactiveTimeout, setInactiveTimeout] = useState<number | null>(null);
  const [inactiveChannelName, setInactiveChannelName] = useState("AFK");

  const afkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const afkKickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpeakingRef = useRef(false);

  const displayName = (user as any)?.user_metadata?.display_name ?? user?.email?.split("@")[0] ?? "User";

  // ── LiveKit Room ──────────────────────────────────────────────────────────

  const lk = useLiveKitRoom({
    roomName: serverVoiceRoom(channelId),
    participantName: displayName,
    participantIdentity: user?.id ?? "",
    initialMuted: globalMuted,
    initialDeafened: globalDeafened,
    onDisconnected: () => {
      cleanupDb();
      onDisconnect();
    },
  });

  // ── Idle / AFK timers ─────────────────────────────────────────────────────

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      onDisconnect();
    }, 60 * 60 * 1000); // 1 hour
  }, [onDisconnect]);

  // Fetch AFK settings
  useEffect(() => {
    if (!serverId) return;
    (async () => {
      const { data } = await supabase
        .from("servers" as any)
        .select("inactive_channel_id, inactive_timeout")
        .eq("id", serverId)
        .maybeSingle();
      const icId = (data as any)?.inactive_channel_id ?? null;
      const icTimeout = (data as any)?.inactive_timeout ?? null;
      setInactiveChannelId(icId);
      setInactiveTimeout(icTimeout);
      if (icId) {
        const { data: chData } = await supabase
          .from("channels" as any)
          .select("name")
          .eq("id", icId)
          .maybeSingle();
        setInactiveChannelName((chData as any)?.name ?? "AFK");
      }
    })();
  }, [serverId]);

  // Enforce AFK audio state
  useEffect(() => {
    if (inactiveChannelId && channelId === inactiveChannelId) {
      if (!globalMuted) setGlobalMuted(true);
      if (!globalDeafened) setGlobalDeafened(true);
    }
  }, [channelId, inactiveChannelId, globalMuted, globalDeafened, setGlobalMuted, setGlobalDeafened]);

  // 6-hour hard disconnect when sitting in AFK channel
  useEffect(() => {
    if (afkKickTimerRef.current) clearTimeout(afkKickTimerRef.current);
    if (inactiveChannelId && channelId === inactiveChannelId) {
      afkKickTimerRef.current = setTimeout(() => onDisconnect(), 6 * 60 * 60 * 1000);
    }
    return () => { if (afkKickTimerRef.current) clearTimeout(afkKickTimerRef.current); };
  }, [channelId, inactiveChannelId, onDisconnect]);

  const resetAfkTimer = useCallback(() => {
    if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
    if (!inactiveChannelId || !inactiveTimeout) return;
    if (channelId === inactiveChannelId) return;
    afkTimerRef.current = setTimeout(() => {
      toast.info(t("voice.movedToAfk"));
      setVoiceChannel({ id: inactiveChannelId, name: inactiveChannelName, serverId });
    }, inactiveTimeout * 60 * 1000);
  }, [inactiveChannelId, inactiveTimeout, inactiveChannelName, channelId, serverId, setVoiceChannel, t]);

  useEffect(() => {
    resetAfkTimer();
    return () => { if (afkTimerRef.current) clearTimeout(afkTimerRef.current); };
  }, [resetAfkTimer]);

  // ── DB presence helpers ───────────────────────────────────────────────────

  const cleanupDb = useCallback(() => {
    if (!user) return;
    supabase
      .from("voice_channel_participants" as any)
      .delete()
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .then();
  }, [user, channelId]);

  // ── Speaking detection → DB + AFK reset ───────────────────────────────────

  useEffect(() => {
    if (!user || !isJoined) return;
    // Check if local user is in activeSpeakers
    const isSpeaking = lk.activeSpeakers.has(user.id);
    if (isSpeaking === lastSpeakingRef.current) return;
    lastSpeakingRef.current = isSpeaking;

    if (isSpeaking) {
      resetIdleTimer();
      resetAfkTimer();
    }

    supabase
      .from("voice_channel_participants" as any)
      .update({ is_speaking: isSpeaking } as any)
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .then();
  }, [lk.activeSpeakers, user, isJoined, channelId, resetIdleTimer, resetAfkTimer]);

  // ── Sync mute/deafen to LiveKit + DB ──────────────────────────────────────

  useEffect(() => {
    if (lk.callState !== "connected") return;
    const room = lk.room.current;
    if (!room) return;
    room.localParticipant.setMicrophoneEnabled(!globalMuted);
  }, [globalMuted, lk.callState]);

  useEffect(() => {
    if (lk.callState !== "connected") return;
    const room = lk.room.current;
    if (!room) return;
    // Deafen: disable all remote audio tracks
    room.remoteParticipants.forEach((p) => {
      p.audioTrackPublications.forEach((pub) => {
        if (pub.track) {
          (pub.track as any).mediaStreamTrack.enabled = !globalDeafened;
        }
      });
    });
  }, [globalDeafened, lk.callState]);

  // Sync mute/deafen state to database
  useEffect(() => {
    if (!user || !isJoined) return;
    supabase
      .from("voice_channel_participants" as any)
      .update({ is_muted: globalMuted, is_deafened: globalDeafened } as any)
      .eq("channel_id", channelId)
      .eq("user_id", user.id)
      .then();
  }, [globalMuted, globalDeafened, isJoined, user, channelId]);

  // ── Sync remote screen shares to VoiceChannelContext ──────────────────────

  useEffect(() => {
    if (lk.remoteScreenStreams.length > 0) {
      // For now, show the first remote screen share (multi-stream grid comes in Phase 4 UI)
      const first = lk.remoteScreenStreams[0];
      setRemoteScreenStream(first.stream);
      setScreenSharerName(first.name);
    } else {
      setRemoteScreenStream(null);
      setScreenSharerName(null);
    }
  }, [lk.remoteScreenStreams, setRemoteScreenStream, setScreenSharerName]);

  // ── Sync remote cameras to VoiceChannelContext ────────────────────────────

  useEffect(() => {
    if (lk.remoteCameraStreams.length > 0) {
      setRemoteCameraStream(lk.remoteCameraStreams[0].stream);
    } else {
      setRemoteCameraStream(null);
    }
  }, [lk.remoteCameraStreams, setRemoteCameraStream]);

  // ── Screen share via custom events from ChannelSidebar ────────────────────

  useEffect(() => {
    const startHandler = async (e: Event) => {
      const settings = (e as CustomEvent).detail;
      await lk.startScreenShare({
        resolution: settings?.resolution,
        fps: settings?.fps,
        sourceId: settings?.sourceId,
      });
      setIsScreenSharing(true);

      // Detect resolution label
      const room = lk.room.current;
      if (room) {
        const pub = room.localParticipant.getTrackPublication("screen_share" as any);
        if (pub?.track) {
          const { width: tw = 0, height: th = 0 } = pub.track.mediaStreamTrack.getSettings();
          const resLabel = tw >= 3840 || th >= 2160 ? "4K"
            : tw >= 2560 || th >= 1440 ? "2K"
            : th >= 1080 ? "1080p"
            : th >= 720 ? "720p"
            : th > 0 ? `${th}p`
            : settings?.resolution ?? null;
          setNativeResolutionLabel(resLabel);
        }
      }

      // Update DB
      if (user) {
        supabase
          .from("voice_channel_participants" as any)
          .update({ is_screen_sharing: true } as any)
          .eq("channel_id", channelId)
          .eq("user_id", user.id)
          .then();

        // Notify server members
        supabase
          .from("server_members" as any)
          .select("user_id")
          .eq("server_id", serverId)
          .neq("user_id", user.id)
          .then(({ data: members }) => {
            if (members?.length) {
              const notifications = (members as any[]).map((m: any) => ({
                user_id: m.user_id,
                actor_id: user.id,
                type: "stream_start",
                entity_id: serverId,
              }));
              supabase.from("notifications" as any).insert(notifications as any).then();
            }
          });
      }
    };

    const stopHandler = async () => {
      await lk.stopScreenShare();
      setIsScreenSharing(false);
      setNativeResolutionLabel(null);

      if (user) {
        supabase
          .from("voice_channel_participants" as any)
          .update({ is_screen_sharing: false } as any)
          .eq("channel_id", channelId)
          .eq("user_id", user.id)
          .then();
      }
    };

    window.addEventListener("start-screen-share", startHandler);
    window.addEventListener("stop-screen-share", stopHandler);
    return () => {
      window.removeEventListener("start-screen-share", startHandler);
      window.removeEventListener("stop-screen-share", stopHandler);
    };
  }, [lk, user, channelId, serverId, setIsScreenSharing, setNativeResolutionLabel]);

  // ── Camera via custom events from ChannelSidebar ──────────────────────────

  useEffect(() => {
    const handler = async () => {
      if (lk.isCameraOn) {
        await lk.stopCamera();
        setIsCameraOn(false);
        setLocalCameraStream(null);
      } else {
        await lk.startCamera();
        setIsCameraOn(true);
        // Get local camera stream from LiveKit
        const room = lk.room.current;
        if (room) {
          const pub = room.localParticipant.getTrackPublication("camera" as any);
          if (pub?.track?.mediaStream) {
            setLocalCameraStream(pub.track.mediaStream);
          }
        }
      }
    };
    window.addEventListener("toggle-camera", handler);
    return () => window.removeEventListener("toggle-camera", handler);
  }, [lk, setIsCameraOn, setLocalCameraStream]);

  // ── Soundboard via custom events ──────────────────────────────────────────

  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent).detail?.url;
      if (!url) return;
      lk.sendData({ type: "soundboard_play", sound_url: url });
    };
    window.addEventListener("play-soundboard", handler);
    return () => window.removeEventListener("play-soundboard", handler);
  }, [lk.sendData]);

  // Listen for soundboard data messages
  useEffect(() => {
    if (!lk.lastDataMessage) return;
    const msg = lk.lastDataMessage as any;
    if (msg.type === "soundboard_play" && msg.sound_url) {
      const audio = new Audio(msg.sound_url);
      audio.volume = 0.7;
      audio.play().catch(() => {});
    }
  }, [lk.lastDataMessage]);

  // ── Auto-join on mount ────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const join = async () => {
      try {
        await lk.connect();
        if (!mounted) { lk.disconnect(); return; }

        // Insert DB presence row
        await supabase
          .from("voice_channel_participants" as any)
          .insert({ channel_id: channelId, user_id: user.id } as any);

        if (mounted) {
          setIsJoined(true);
          window.dispatchEvent(new CustomEvent("voice-participants-changed"));
        }

        // Broadcast entrance sound
        if (serverId) {
          const { data: memberData } = await supabase
            .from("server_members" as any)
            .select("entrance_sound_id, server_soundboard!entrance_sound_id(url)")
            .eq("server_id", serverId)
            .eq("user_id", user.id)
            .maybeSingle();
          const entranceSoundUrl = (memberData as any)?.server_soundboard?.url;
          if (entranceSoundUrl) {
            lk.sendData({ type: "soundboard_play", sound_url: entranceSoundUrl });
          }
        }
      } catch (err) {
        console.error("[VoiceConnection] join failed:", err);
      }
    };

    join();
    resetIdleTimer();

    return () => {
      mounted = false;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
    };
  }, [channelId, user]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      setIsScreenSharing(false);
      setRemoteScreenStream(null);
      setScreenSharerName(null);
      setIsCameraOn(false);
      setLocalCameraStream(null);
      setRemoteCameraStream(null);
      setNativeResolutionLabel(null);
      lk.disconnect();
      cleanupDb();
    };
  }, []);

  return null; // Headless — no UI
};

export default VoiceConnectionManager;
