import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";

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

interface VoiceConnectionManagerProps {
  channelId: string;
  channelName: string;
  serverId: string;
  onDisconnect: () => void;
}

/** Headless component — manages WebRTC voice connection with no visible UI */
const VoiceConnectionManager = ({ channelId, channelName, serverId, onDisconnect }: VoiceConnectionManagerProps) => {
  const { user } = useAuth();
  const { globalMuted, globalDeafened } = useAudioSettings();
  const [isJoined, setIsJoined] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudiosRef = useRef<HTMLAudioElement[]>([]);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const volumeMonitorsRef = useRef<Array<{ cleanup: () => void }>>([]);
  // speakingChannelRef removed — speaking state now stored in DB

  const lastSpeakingRef = useRef<boolean>(false);

  const updateSpeaking = useCallback((userId: string, isSpeaking: boolean) => {
    if (lastSpeakingRef.current === isSpeaking) return;
    lastSpeakingRef.current = isSpeaking;
    supabase
      .from("voice_channel_participants" as any)
      .update({ is_speaking: isSpeaking } as any)
      .eq("channel_id", channelId)
      .eq("user_id", userId)
      .then();
  }, [channelId]);

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
        if (globalMuted) {
          stream.getAudioTracks().forEach(t => { t.enabled = false; });
        }
        localStreamRef.current = stream;
        setupSignaling();
        await supabase.from("voice_channel_participants" as any).insert({ channel_id: channelId, user_id: user.id } as any);
        if (mounted) setIsJoined(true);

        const localMonitor = createVolumeMonitor(stream, (isSpeaking) => {
          updateSpeaking(user.id, isSpeaking);
        });
        volumeMonitorsRef.current.push(localMonitor);

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

  // Cleanup on unmount (disconnect)
  useEffect(() => {
    return () => {
      volumeMonitorsRef.current.forEach((m) => m.cleanup());
      volumeMonitorsRef.current = [];
      if (user) {
        channelRef.current?.send({ type: "broadcast", event: "voice-leave", payload: { userId: user.id } });
        supabase.from("voice_channel_participants" as any).delete().eq("channel_id", channelId).eq("user_id", user.id).then();
        peerConnectionsRef.current.forEach((pc) => pc.close());
        localStreamRef.current?.getTracks().forEach((t) => t.stop());
        channelRef.current?.unsubscribe();
      }
    };
  }, []);

  return null; // Headless — no UI
};

export default VoiceConnectionManager;
