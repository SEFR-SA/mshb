import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/** Patch SDP to enforce min/max bitrate on video codecs */
function patchSdpBitrate(sdp: string): string {
  return sdp.replace(
    /a=fmtp:(\d+) ([^\r\n]+)/g,
    (match, pt, params) => {
      if (params.includes("x-google-max-bitrate")) return match;
      return `a=fmtp:${pt} ${params};x-google-max-bitrate=8000;x-google-min-bitrate=2000`;
    }
  );
}

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
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null);
  const [remoteCameraStream, setRemoteCameraStream] = useState<MediaStream | null>(null);
  const remoteAudiosRef = useRef<HTMLAudioElement[]>([]);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenSenderRef = useRef<RTCRtpSender | null>(null);
  const screenAudioSendersRef = useRef<RTCRtpSender[]>([]);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraSenderRef = useRef<RTCRtpSender | null>(null);
  const remoteCameraExpectedRef = useRef(false);
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
    screenAudioSendersRef.current = [];
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    cameraSenderRef.current = null;
    setIsScreenSharing(false);
    setRemoteScreenStream(null);
    setIsCameraOn(false);
    setLocalCameraStream(null);
    setRemoteCameraStream(null);
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
        if (remoteCameraExpectedRef.current) {
          remoteCameraExpectedRef.current = false;
          setRemoteCameraStream(event.streams[0]);
          event.track.onended = () => setRemoteCameraStream(null);
        } else {
          setRemoteScreenStream(event.streams[0]);
          event.track.onended = () => setRemoteScreenStream(null);
        }
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
        // Patch SDP for bitrate enforcement
        const patchedSdp = patchSdpBitrate(offer.sdp || "");
        await pc.setLocalDescription({ ...offer, sdp: patchedSdp });
        channelRef.current?.send({
          type: "broadcast",
          event: "call-offer",
          payload: { sdp: { ...offer, sdp: patchedSdp } },
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

  // Camera
  const startCamera = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || isCameraOn) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } },
      });
      cameraStreamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      const sender = pc.addTrack(videoTrack, stream);
      cameraSenderRef.current = sender;
      try {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
        params.encodings[0].maxBitrate = 4_000_000;
        (params as any).degradationPreference = "maintain-resolution";
        await sender.setParameters(params);
      } catch {}
      setIsCameraOn(true);
      setLocalCameraStream(stream);

      // Signal remote that camera is on
      channelRef.current?.send({
        type: "broadcast",
        event: "camera-toggle",
        payload: { on: true },
      });

      videoTrack.onended = () => stopCamera();
    } catch {
      // Camera permission denied
    }
  }, [isCameraOn]);

  const stopCamera = useCallback(() => {
    const pc = pcRef.current;
    if (cameraSenderRef.current && pc) {
      try { pc.removeTrack(cameraSenderRef.current); } catch {}
    }
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    cameraSenderRef.current = null;
    setIsCameraOn(false);
    setLocalCameraStream(null);

    channelRef.current?.send({
      type: "broadcast",
      event: "camera-toggle",
      payload: { on: false },
    });
  }, []);

  // Screen sharing
  const startScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || isScreenSharing) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } },
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, systemAudio: "include" } as any,
      });

      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) return;

      screenStreamRef.current = stream;
      const videoTrack = videoTracks[0];
      videoTrack.contentHint = "motion";

      const sender = pc.addTrack(videoTrack, stream);
      screenSenderRef.current = sender;
      // Enforce high bitrate and resolution preservation
      try {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
        params.encodings[0].maxBitrate = 8_000_000;
        (params.encodings[0] as any).minBitrate = 2_000_000;
        (params as any).degradationPreference = "maintain-resolution";
        await sender.setParameters(params);
      } catch {}

      // Handle system audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const audioSenders: RTCRtpSender[] = [];
        for (const audioTrack of audioTracks) {
          const audioSender = pc.addTrack(audioTrack, stream);
          audioSenders.push(audioSender);
        }
        screenAudioSendersRef.current = audioSenders;
      } else {
        toast.info("Audio not shared");
      }

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
    // Remove screen audio senders
    for (const sender of screenAudioSendersRef.current) {
      try { pc?.removeTrack(sender); } catch {}
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    screenSenderRef.current = null;
    screenAudioSendersRef.current = [];
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
      .on("broadcast", { event: "camera-toggle" }, ({ payload }) => {
        remoteCameraExpectedRef.current = !!payload.on;
        if (!payload.on) setRemoteCameraStream(null);
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
        .on("broadcast", { event: "camera-toggle" }, ({ payload }) => {
          remoteCameraExpectedRef.current = !!payload.on;
          if (!payload.on) setRemoteCameraStream(null);
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
        .on("broadcast", { event: "camera-toggle" }, ({ payload }) => {
          remoteCameraExpectedRef.current = !!payload.on;
          if (!payload.on) setRemoteCameraStream(null);
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
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
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
    isCameraOn,
    localCameraStream,
    remoteCameraStream,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleDeafen,
    startScreenShare,
    stopScreenShare,
    startCamera,
    stopCamera,
  };
}
