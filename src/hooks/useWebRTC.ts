import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export type CallState = "idle" | "ringing" | "connected" | "ended";

interface UseWebRTCOptions {
  sessionId: string | null;
  isCaller: boolean;
  onEnded?: () => void;
  initialMuted?: boolean;
  initialDeafened?: boolean;
}

export function useWebRTC({ sessionId, isCaller, onEnded, initialMuted = false, initialDeafened = false }: UseWebRTCOptions) {
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isDeafened, setIsDeafened] = useState(initialDeafened);
  const [callDuration, setCallDuration] = useState(0);
  const remoteAudiosRef = useRef<HTMLAudioElement[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const durationInterval = useRef<ReturnType<typeof setInterval>>();
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const cleanup = useCallback(() => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setCallState("ended");
    setCallDuration(0);
    setIsMuted(false);
    onEnded?.();
  }, [onEnded]);

  const startDurationTimer = useCallback(() => {
    const start = Date.now();
    durationInterval.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
  }, []);

  const setupPeerConnection = useCallback(async () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      // Apply initial mute
      if (initialMuted) {
        stream.getAudioTracks().forEach((t) => { t.enabled = false; });
      }
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } catch (error) {
      console.error('[WebRTC] getUserMedia failed:', error);
    }

    // Play remote audio
    pc.ontrack = (event) => {
      const audio = new Audio();
      audio.srcObject = event.streams[0];
      audio.muted = initialDeafened;
      audio.play().catch(() => {});
      remoteAudiosRef.current.push(audio);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: event.candidate.toJSON() },
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setCallState("connected");
        startDurationTimer();
      }
      if (["disconnected", "failed", "closed"].includes(pc.connectionState)) {
        cleanup();
      }
    };

    return pc;
  }, [cleanup, startDurationTimer]);

  const processQueuedCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    for (const candidate of iceCandidateQueue.current) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    }
    iceCandidateQueue.current = [];
  }, []);

  // Join broadcast channel for signaling
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`call-${sessionId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "call-offer" }, async ({ payload }) => {
        if (isCaller) return; // callee handles offers
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await processQueuedCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({
          type: "broadcast",
          event: "call-answer",
          payload: { sdp: answer },
        });
      })
      .on("broadcast", { event: "call-answer" }, async ({ payload }) => {
        if (!isCaller) return; // caller handles answers
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await processQueuedCandidates();
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        const pc = pcRef.current;
        if (!pc) return;
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
        } else {
          iceCandidateQueue.current.push(payload.candidate);
        }
      })
      .on("broadcast", { event: "call-end" }, () => {
        cleanup();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [sessionId, isCaller, cleanup, processQueuedCandidates]);

  const startCall = useCallback(async (overrideSessionId?: string) => {
    const sid = overrideSessionId || sessionId;
    if (!sid) return;
    setCallState("ringing");

    // Ensure signaling channel is ready before sending offer
    if (!channelRef.current) {
      const channel = supabase.channel(`call-${sid}`);
      channelRef.current = channel;
      channel
        .on("broadcast", { event: "call-answer" }, async ({ payload }) => {
          const pc = pcRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          await processQueuedCandidates();
        })
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          const pc = pcRef.current;
          if (!pc) return;
          if (pc.remoteDescription) {
            try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
          } else {
            iceCandidateQueue.current.push(payload.candidate);
          }
        })
        .on("broadcast", { event: "call-end" }, () => {
          cleanup();
        })
        .subscribe();
    }

    const pc = await setupPeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Small delay to ensure channel is subscribed on both sides
    setTimeout(() => {
      channelRef.current?.send({
        type: "broadcast",
        event: "call-offer",
        payload: { sdp: offer },
      });
    }, 1000);
  }, [sessionId, setupPeerConnection, cleanup, processQueuedCandidates]);

  const answerCall = useCallback(async (overrideSessionId?: string) => {
    const sid = overrideSessionId || sessionId;
    if (!sid) return;
    setCallState("ringing");

    // Ensure signaling channel is ready (bypass stale closure)
    if (!channelRef.current) {
      const channel = supabase.channel(`call-${sid}`);
      channelRef.current = channel;
      channel
        .on("broadcast", { event: "call-offer" }, async ({ payload }) => {
          const pc = pcRef.current;
          if (!pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          await processQueuedCandidates();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          channel.send({
            type: "broadcast",
            event: "call-answer",
            payload: { sdp: answer },
          });
        })
        .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
          const pc = pcRef.current;
          if (!pc) return;
          if (pc.remoteDescription) {
            try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); } catch {}
          } else {
            iceCandidateQueue.current.push(payload.candidate);
          }
        })
        .on("broadcast", { event: "call-end" }, () => {
          cleanup();
        })
        .subscribe();
    }

    await setupPeerConnection();
  }, [sessionId, setupPeerConnection, cleanup, processQueuedCandidates]);

  const endCall = useCallback(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "call-end",
      payload: {},
    });
    cleanup();
  }, [cleanup]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }, []);

  const toggleDeafen = useCallback(() => {
    setIsDeafened((prev) => {
      const next = !prev;
      remoteAudiosRef.current.forEach((a) => { a.muted = next; });
      // Deafen implies mute
      if (next) {
        localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false; });
        setIsMuted(true);
      }
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      if (durationInterval.current) clearInterval(durationInterval.current);
    };
  }, []);

  return {
    callState,
    isMuted,
    isDeafened,
    callDuration,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleDeafen,
  };
}
