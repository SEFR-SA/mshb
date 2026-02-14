import React, { useEffect, useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PhoneOff, Volume2 } from "lucide-react";

interface Participant {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface VoiceConnectionBarProps {
  channelId: string;
  channelName: string;
  serverId: string;
  onDisconnect: () => void;
}

/** Monitor a MediaStream's volume via AnalyserNode and call back with isSpeaking */
function createVolumeMonitor(
  stream: MediaStream,
  onSpeaking: (isSpeaking: boolean) => void
): { cleanup: () => void } {
  const audioCtx = new AudioContext();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  const source = audioCtx.createMediaStreamSource(stream);
  source.connect(analyser);
  const dataArray = new Uint8Array(analyser.frequencyBinCount);
  let rafId: number;
  let wasSpeaking = false;

  const check = () => {
    analyser.getByteFrequencyData(dataArray);
    const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const speaking = avg > 15;
    if (speaking !== wasSpeaking) {
      wasSpeaking = speaking;
      onSpeaking(speaking);
    }
    rafId = requestAnimationFrame(check);
  };
  check();

  return {
    cleanup: () => {
      cancelAnimationFrame(rafId);
      source.disconnect();
      audioCtx.close().catch(() => {});
    },
  };
}

const VoiceConnectionBar = ({ channelId, channelName, serverId, onDisconnect }: VoiceConnectionBarProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { globalMuted, globalDeafened } = useAudioSettings();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudiosRef = useRef<HTMLAudioElement[]>([]);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const volumeMonitorsRef = useRef<Array<{ cleanup: () => void }>>([]);

  const updateSpeaking = useCallback((userId: string, isSpeaking: boolean) => {
    setSpeakingUsers((prev) => {
      const next = new Set(prev);
      if (isSpeaking) next.add(userId);
      else next.delete(userId);
      return next;
    });
    // Broadcast so sidebar can show it too
    channelRef.current?.send({
      type: "broadcast",
      event: "voice-speaking",
      payload: { userId, isSpeaking },
    });
  }, []);

  const loadParticipants = useCallback(async () => {
    const { data } = await supabase
      .from("voice_channel_participants" as any)
      .select("user_id")
      .eq("channel_id", channelId);
    if (!data) return;
    const userIds = (data as any[]).map((p) => p.user_id);
    if (userIds.length === 0) { setParticipants([]); return; }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", userIds);
    setParticipants((profiles || []).map((p) => ({
      user_id: p.user_id,
      display_name: p.display_name,
      username: p.username,
      avatar_url: p.avatar_url,
    })));
  }, [channelId]);

  // Realtime participant updates
  useEffect(() => {
    loadParticipants();
    const sub = supabase
      .channel(`voice-bar-${channelId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_channel_participants", filter: `channel_id=eq.${channelId}` }, () => loadParticipants())
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [channelId, loadParticipants]);

  const createPeerConnection = useCallback((peerId: string) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peerConnectionsRef.current.set(peerId, pc);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
    }
    pc.ontrack = (e) => {
      const audio = new Audio();
      audio.srcObject = e.streams[0];
      audio.muted = globalDeafened;
      audio.play().catch(() => {});
      remoteAudiosRef.current.push(audio);

      // Monitor remote user's volume
      const monitor = createVolumeMonitor(e.streams[0], (isSpeaking) => {
        updateSpeaking(peerId, isSpeaking);
      });
      volumeMonitorsRef.current.push(monitor);
    };
    pc.onicecandidate = (e) => {
      if (e.candidate && user) {
        channelRef.current?.send({
          type: "broadcast", event: "voice-ice",
          payload: { candidate: e.candidate, senderId: user.id, targetId: peerId },
        });
      }
    };
    return pc;
  }, [user, updateSpeaking]);

  const setupSignaling = useCallback(() => {
    if (channelRef.current) return;
    const ch = supabase.channel(`voice-signal-${channelId}`);
    channelRef.current = ch;
    ch.on("broadcast", { event: "voice-offer" }, async ({ payload }) => {
      if (!user || payload.targetId !== user.id) return;
      const pc = createPeerConnection(payload.senderId);
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      ch.send({ type: "broadcast", event: "voice-answer", payload: { sdp: answer, senderId: user.id, targetId: payload.senderId } });
    })
    .on("broadcast", { event: "voice-answer" }, async ({ payload }) => {
      if (!user || payload.targetId !== user.id) return;
      const pc = peerConnectionsRef.current.get(payload.senderId);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
    })
    .on("broadcast", { event: "voice-ice" }, async ({ payload }) => {
      if (!user || payload.targetId !== user.id) return;
      const pc = peerConnectionsRef.current.get(payload.senderId);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
    })
    .on("broadcast", { event: "voice-leave" }, ({ payload }) => {
      const pc = peerConnectionsRef.current.get(payload.userId);
      if (pc) { pc.close(); peerConnectionsRef.current.delete(payload.userId); }
      // Remove from speaking
      setSpeakingUsers((prev) => { const n = new Set(prev); n.delete(payload.userId); return n; });
    })
    .subscribe();
  }, [channelId, user, createPeerConnection]);

  // Auto-join on mount
  useEffect(() => {
    if (!user) return;
    let mounted = true;

    const join = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (!mounted) { stream.getTracks().forEach(t => t.stop()); return; }
        // Apply global mute on join
        if (globalMuted) {
          stream.getAudioTracks().forEach(t => { t.enabled = false; });
        }
        localStreamRef.current = stream;
        setupSignaling();
        await supabase.from("voice_channel_participants" as any).insert({ channel_id: channelId, user_id: user.id } as any);
        if (mounted) setIsJoined(true);

        // Monitor local user's volume
        const localMonitor = createVolumeMonitor(stream, (isSpeaking) => {
          updateSpeaking(user.id, isSpeaking);
        });
        volumeMonitorsRef.current.push(localMonitor);

        // Connect to existing participants
        setTimeout(async () => {
          if (!mounted) return;
          const { data } = await supabase.from("voice_channel_participants" as any).select("user_id").eq("channel_id", channelId);
          const others = ((data as any[]) || []).filter((p) => p.user_id !== user.id);
          for (const other of others) {
            const pc = createPeerConnection(other.user_id);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            channelRef.current?.send({
              type: "broadcast", event: "voice-offer",
              payload: { sdp: offer, senderId: user.id, targetId: other.user_id },
            });
          }
        }, 500);
      } catch {
        // Microphone permission denied
      }
    };
    join();

    return () => {
      mounted = false;
    };
  }, [channelId, user, setupSignaling, createPeerConnection, updateSpeaking]);

  const leaveVoice = useCallback(async () => {
    if (!user) return;
    channelRef.current?.send({ type: "broadcast", event: "voice-leave", payload: { userId: user.id } });
    peerConnectionsRef.current.forEach((pc) => pc.close());
    peerConnectionsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    // Cleanup volume monitors
    volumeMonitorsRef.current.forEach((m) => m.cleanup());
    volumeMonitorsRef.current = [];
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    await supabase.from("voice_channel_participants" as any).delete().eq("channel_id", channelId).eq("user_id", user.id);
    setIsJoined(false);
    setSpeakingUsers(new Set());
    onDisconnect();
  }, [user, channelId, onDisconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      volumeMonitorsRef.current.forEach((m) => m.cleanup());
      volumeMonitorsRef.current = [];
      if (user) {
        supabase.from("voice_channel_participants" as any).delete().eq("channel_id", channelId).eq("user_id", user.id).then();
        peerConnectionsRef.current.forEach((pc) => pc.close());
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        channelRef.current?.unsubscribe();
      }
    };
  }, []);

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-t border-border/50 bg-muted/30">
      <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
      <Volume2 className="h-4 w-4 text-green-500 shrink-0" />
      <span className="text-sm font-medium truncate">{channelName}</span>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={leaveVoice}>
        <PhoneOff className="h-4 w-4" />
      </Button>
      <div className="flex items-center -space-x-1.5 ms-2">
        {participants.slice(0, 5).map((p) => (
          <Avatar
            key={p.user_id}
            className={`h-6 w-6 border-2 border-background transition-all duration-150 ${
              speakingUsers.has(p.user_id) ? "ring-2 ring-[#00db21]" : ""
            }`}
          >
            <AvatarImage src={p.avatar_url || ""} />
            <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
              {(p.display_name || p.username || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
        {participants.length > 5 && (
          <span className="text-xs text-muted-foreground ms-2">+{participants.length - 5}</span>
        )}
      </div>
    </div>
  );
};

export default VoiceConnectionBar;
