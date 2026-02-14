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
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);
  const remoteAudiosRef = useRef<HTMLAudioElement[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenSenderRef = useRef<RTCRtpSender | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const durationInterval = useRef<ReturnType<typeof setInterval>>();
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);

  const cleanup = useCallback(() => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    screenSenderRef.current = null;
    setIsScreenSharing(false);
    setRemoteScreenStream(null);
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
      if (initialMuted) {
        stream.getAudioTracks().forEach((t) => { t.enabled = false; });
      }
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    } catch (error) {
      console.error('[WebRTC] getUserMedia failed:', error);
    }

    pc.ontrack = (event) => {
      if (event.track.kind === "video") {
        setRemoteScreenStream(event.streams[0]);
        event.track.onended = () => setRemoteScreenStream(null);
      } else {
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.muted = initialDeafened;
        audio.play().catch(() => {});
        remoteAudiosRef.current.push(audio);
      }
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

    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        channelRef.current?.send({
          type: "broadcast",
          event: "call-offer",
          payload: { sdp: offer },
        });
      } catch {}
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

  // Screen sharing
  const startScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || isScreenSharing) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      const sender = pc.addTrack(videoTrack, stream);
      screenSenderRef.current = sender;
      setIsScreenSharing(true);

      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch {
      // User cancelled the picker
    }
  }, [isScreenSharing]);

  const stopScreenShare = useCallback(() => {
    const pc = pcRef.current;
    if (screenSenderRef.current && pc) {
      try { pc.removeTrack(screenSenderRef.current); } catch {}
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    screenSenderRef.current = null;
    setIsScreenSharing(false);
  }, []);

  // Join broadcast channel for signaling
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase.channel(`call-${sessionId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "call-offer" }, async ({ payload }) => {
        if (isCaller) return;
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
        if (!isCaller) return;
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
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
      if (durationInterval.current) clearInterval(durationInterval.current);
    };
  }, []);

  return {
    callState,
    isMuted,
    isDeafened,
    callDuration,
    isScreenSharing,
    remoteScreenStream,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
  };
}
