import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

/** Optimize SDP for gaming: inject bitrate limits and x-google encoder params */
function optimizeSDPForGaming(sdp: string, maxKbps = 25000, startKbps = 5000, minKbps = 2000): string {
  let s = sdp;
  s = s.replace(/b=AS:[^\r\n]*\r\n/g, '');
  s = s.replace(/b=TIAS:[^\r\n]*\r\n/g, '');
  s = s.replace(/(m=video .+\r\n)/, `$1b=AS:${maxKbps}\r\n`);
  s = s.replace(/a=fmtp:(\d+) ([^\r\n]+)/g, (_m, pt, params) => {
    const clean = params
      .replace(/;?\s*x-google-start-bitrate=\d+/g, '')
      .replace(/;?\s*x-google-min-bitrate=\d+/g, '')
      .replace(/;?\s*x-google-max-bitrate=\d+/g, '');
    return `a=fmtp:${pt} ${clean};x-google-start-bitrate=${startKbps};x-google-min-bitrate=${minKbps};x-google-max-bitrate=${maxKbps}`;
  });
  return s;
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
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
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
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iceCandidateQueue = useRef<RTCIceCandidateInit[]>([]);
  // Flag to suppress onnegotiationneeded during initial setup
  const suppressNegotiationRef = useRef(false);
  const remoteScreenStreamIdsRef = useRef<Set<string>>(new Set());
  const audiosByStreamIdRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const cleanup = useCallback(() => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    if (statsIntervalRef.current) { clearInterval(statsIntervalRef.current); statsIntervalRef.current = null; }
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
    setLocalScreenStream(null);
    setRemoteScreenStream(null);
    setIsCameraOn(false);
    setLocalCameraStream(null);
    setRemoteCameraStream(null);
    remoteAudiosRef.current.forEach((a) => { a.pause(); a.srcObject = null; });
    remoteAudiosRef.current = [];
    remoteScreenStreamIdsRef.current.clear();
    audiosByStreamIdRef.current.clear();
    pcRef.current?.close();
    pcRef.current = null;
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    iceCandidateQueue.current = [];
    setCallState("ended");
    setCallDuration(0);
    setIsMuted(false);
    onEnded?.();
  }, [onEnded]);

  const startDurationTimer = useCallback(() => {
    if (durationInterval.current) clearInterval(durationInterval.current);
    const start = Date.now();
    durationInterval.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - start) / 1000));
    }, 1000);
  }, []);

  const processQueuedCandidates = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const queued = [...iceCandidateQueue.current];
    iceCandidateQueue.current = [];
    for (const candidate of queued) {
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    }
  }, []);

  /**
   * Create an RTCPeerConnection with audio, wire up event handlers.
   * Does NOT create offer/answer — caller does that separately.
   */
  const setupPeerConnection = useCallback(async () => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // Suppress initial negotiation triggered by addTrack
    suppressNegotiationRef.current = true;

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

    // Allow future negotiation (for screen share / camera additions)
    suppressNegotiationRef.current = false;

    pc.ontrack = (event) => {
      if (event.track.kind === "video") {
        if (remoteCameraExpectedRef.current) {
          remoteCameraExpectedRef.current = false;
          setRemoteCameraStream(event.streams[0]);
          event.track.onended = () => setRemoteCameraStream(null);
        } else {
          const screenStreamId = event.streams[0]?.id;
          if (screenStreamId) {
            remoteScreenStreamIdsRef.current.add(screenStreamId);
            const wrongAudio = audiosByStreamIdRef.current.get(screenStreamId);
            if (wrongAudio) {
              wrongAudio.pause();
              wrongAudio.srcObject = null;
              remoteAudiosRef.current = remoteAudiosRef.current.filter(a => a !== wrongAudio);
              audiosByStreamIdRef.current.delete(screenStreamId);
            }
          }
          setRemoteScreenStream(event.streams[0]);
          event.track.onended = () => {
            if (screenStreamId) remoteScreenStreamIdsRef.current.delete(screenStreamId);
            setRemoteScreenStream(null);
          };
        }
      } else {
        const streamId = event.streams[0]?.id;
        const isScreenAudio =
          (streamId && remoteScreenStreamIdsRef.current.has(streamId)) ||
          (event.streams[0]?.getVideoTracks().length ?? 0) > 0;
        if (isScreenAudio) {
          if (streamId) remoteScreenStreamIdsRef.current.add(streamId);
          return;
        }
        const audio = new Audio();
        audio.srcObject = event.streams[0];
        audio.muted = isDeafened;
        audio.play().catch(() => {});
        remoteAudiosRef.current.push(audio);
        if (streamId) audiosByStreamIdRef.current.set(streamId, audio);
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

    // Only fire for renegotiation (screen share, camera), not initial setup
    pc.onnegotiationneeded = async () => {
      if (suppressNegotiationRef.current) return;
      try {
        const offer = await pc.createOffer();
        const patchedSdp = optimizeSDPForGaming(offer.sdp || "");
        await pc.setLocalDescription({ ...offer, sdp: patchedSdp });
        channelRef.current?.send({
          type: "broadcast",
          event: "call-offer",
          payload: { sdp: { ...offer, sdp: patchedSdp } },
        });
      } catch {}
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[WebRTC] connectionState:', state);
      if (state === "connected") {
        setCallState("connected");
        startDurationTimer();
      }
      if (["failed", "closed"].includes(state)) {
        cleanup();
      }
    };

    return pc;
  }, [cleanup, startDurationTimer, initialMuted, isDeafened]);

  /**
   * Subscribe to the signaling broadcast channel.
   * Returns a Promise that resolves once the subscription is active.
   */
  const ensureChannel = useCallback((sid: string): Promise<ReturnType<typeof supabase.channel>> => {
    // If already subscribed to the correct channel, reuse it
    if (channelRef.current) {
      return Promise.resolve(channelRef.current);
    }

    return new Promise((resolve) => {
      const channel = supabase.channel(`call-${sid}`);
      channelRef.current = channel;

      channel
        .on("broadcast", { event: "call-offer" }, async ({ payload }) => {
          const pc = pcRef.current;
          if (!pc) return;
          // Only callee processes offers during initial setup
          // For renegotiation (screen share), both sides handle it
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            await processQueuedCandidates();
            const answer = await pc.createAnswer();
            const patchedAnswer = optimizeSDPForGaming(answer.sdp || "");
            await pc.setLocalDescription({ ...answer, sdp: patchedAnswer });
            channel.send({
              type: "broadcast",
              event: "call-answer",
              payload: { sdp: { ...answer, sdp: patchedAnswer } },
            });
          } catch (e) {
            console.error('[WebRTC] Error handling offer:', e);
          }
        })
        .on("broadcast", { event: "call-answer" }, async ({ payload }) => {
          const pc = pcRef.current;
          if (!pc) return;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            await processQueuedCandidates();
          } catch (e) {
            console.error('[WebRTC] Error handling answer:', e);
          }
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
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            resolve(channel);
          }
        });
    });
  }, [cleanup, processQueuedCandidates]);

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
  const startScreenShare = useCallback(async (settings?: { resolution?: "720p" | "1080p" | "source"; fps?: 30 | 60; surface?: "monitor" | "window"; sourceId?: string; isPro?: boolean }) => {
    const pc = pcRef.current;
    if (!pc || isScreenSharing) return;
    const isPro = settings?.isPro ?? true; // default true = no restriction if caller omits flag
    const res = (!isPro && settings?.resolution === "source") ? "1080p"
              : (settings?.resolution ?? "1080p");
    const fps = (!isPro && res !== "720p" && (settings?.fps ?? 30) === 60) ? 30
              : (settings?.fps ?? 30);
    const surface = settings?.surface ?? "monitor";
    const sourceId = settings?.sourceId;
    try {
      let stream: MediaStream;
      if (sourceId) {
        // Electron path — capture the specific source the user selected
        const sizeConstraints = res === "720p"
          ? { maxWidth: 1280, maxHeight: 720 }
          : res === "1080p"
          ? { maxWidth: 1920, maxHeight: 1080 }
          : {};
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: sourceId,
              maxFrameRate: fps,
              ...(res === "source" ? { minFrameRate: fps } : {}),
              ...sizeConstraints,
            },
          } as any,
        });
        // Try to capture system audio as a separate track
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { mandatory: { chromeMediaSource: "desktop" } } as any,
            video: false,
          });
          audioStream.getAudioTracks().forEach((t) => stream.addTrack(t));
        } catch {
          // System audio unavailable — continue without it
        }
      } else {
        // Web / browser fallback — shows OS picker
        const videoConstraints: any = {
          displaySurface: surface,
          cursor: "always",
          logicalSurface: true,
          frameRate: { ideal: fps, max: fps, ...(res === "source" ? { min: fps } : {}) },
          ...(res === "720p" ? { width: 1280, height: 720 }
            : res === "1080p" ? { width: 1920, height: 1080 }
            : {}),
        };
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: videoConstraints,
          audio: { echoCancellation: true, noiseSuppression: false, autoGainControl: false, systemAudio: "include" } as any,
        });
      }

      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) return;

      screenStreamRef.current = stream;
      setLocalScreenStream(stream);
      const videoTrack = videoTracks[0];
      videoTrack.contentHint = "detail";

      const bitrate = res === "720p"  ? 6_000_000    // 6 Mbps — 720p @ 60fps
                   : res === "1080p" ? 15_000_000   // 15 Mbps — 1080p @ 60fps
                   :                   25_000_000;  // 25 Mbps — 1440p/source @ 60fps
      const videoTransceiver = pc.addTransceiver(videoTrack, {
        direction: 'sendonly',
        streams: [stream],
        sendEncodings: [{ maxBitrate: bitrate, maxFramerate: fps, priority: 'high' }],
      });
      screenSenderRef.current = videoTransceiver.sender;
      try {
        const caps = (RTCRtpReceiver as any).getCapabilities?.('video');
        if (caps?.codecs) {
          const vp9    = caps.codecs.filter((c: any) => c.mimeType === 'video/VP9');
          const h264Hi = caps.codecs.filter((c: any) => c.mimeType === 'video/H264' && c.sdpFmtpLine?.includes('profile-level-id=64'));
          const rest   = caps.codecs.filter((c: any) => c.mimeType !== 'video/VP9' && !(c.mimeType === 'video/H264' && c.sdpFmtpLine?.includes('profile-level-id=64')));
          videoTransceiver.setCodecPreferences([...vp9, ...h264Hi, ...rest]);
        }
      } catch {}
      try {
        const p = videoTransceiver.sender.getParameters();
        if (p.encodings?.length) { p.degradationPreference = 'maintain-framerate'; await videoTransceiver.sender.setParameters(p); }
      } catch {}

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

      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = setInterval(async () => {
        const s = screenSenderRef.current;
        if (!s || !s.track) return;
        try {
          const stats = await pcRef.current?.getStats(s.track);
          stats?.forEach((report: any) => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              console.log('[ScreenShare] fps:', report.framesPerSecond, 'w:', report.frameWidth, 'h:', report.frameHeight, 'limitReason:', report.qualityLimitationReason);
            }
          });
        } catch {}
      }, 5000);

      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch {
      // User cancelled the picker
    }
  }, [isScreenSharing]);

  const stopScreenShare = useCallback(() => {
    if (statsIntervalRef.current) { clearInterval(statsIntervalRef.current); statsIntervalRef.current = null; }
    const pc = pcRef.current;
    if (screenSenderRef.current && pc) {
      try { pc.removeTrack(screenSenderRef.current); } catch {}
    }
    for (const sender of screenAudioSendersRef.current) {
      try { pc?.removeTrack(sender); } catch {}
    }
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    screenSenderRef.current = null;
    screenAudioSendersRef.current = [];
    setIsScreenSharing(false);
    setLocalScreenStream(null);
  }, []);

  const adjustScreenShareQuality = useCallback(async (preset: '720p30' | '1080p30' | '1080p60' | '1440p60') => {
    const cfg = {
      '720p30':  { maxBitrate: 5_000_000,  maxFramerate: 30 },
      '1080p30': { maxBitrate: 8_000_000,  maxFramerate: 30 },
      '1080p60': { maxBitrate: 15_000_000, maxFramerate: 60 },
      '1440p60': { maxBitrate: 25_000_000, maxFramerate: 60 },
    }[preset];
    const s = screenSenderRef.current;
    if (!s) return;
    const p = s.getParameters();
    if (!p.encodings?.length) return;
    p.encodings[0].maxBitrate = cfg.maxBitrate;
    (p.encodings[0] as any).maxFramerate = cfg.maxFramerate;
    p.degradationPreference = 'maintain-framerate';
    await s.setParameters(p);
  }, []);

  /**
   * Caller: subscribe to channel, setup PC, create & send offer.
   */
  const startCall = useCallback(async (overrideSessionId?: string) => {
    const sid = overrideSessionId || sessionId;
    if (!sid) return;
    setCallState("ringing");

    // 1. Ensure channel is subscribed before doing anything
    const channel = await ensureChannel(sid);

    // 2. Setup peer connection (audio track added here)
    const pc = await setupPeerConnection();

    // 3. Create offer and send it
    try {
      const offer = await pc.createOffer();
      const patchedSdp = optimizeSDPForGaming(offer.sdp || "");
      await pc.setLocalDescription({ ...offer, sdp: patchedSdp });

      // Small delay to ensure callee has subscribed too
      setTimeout(() => {
        channel.send({
          type: "broadcast",
          event: "call-offer",
          payload: { sdp: { ...offer, sdp: patchedSdp } },
        });
      }, 500);
    } catch (e) {
      console.error('[WebRTC] Error creating offer:', e);
    }
  }, [sessionId, setupPeerConnection, ensureChannel]);

  /**
   * Callee: subscribe to channel, setup PC, wait for offer via channel handler.
   */
  const answerCall = useCallback(async (overrideSessionId?: string) => {
    const sid = overrideSessionId || sessionId;
    if (!sid) return;
    setCallState("ringing");

    // 1. Ensure channel is subscribed
    await ensureChannel(sid);

    // 2. Setup peer connection — the channel's "call-offer" handler
    //    will process the offer and create an answer automatically
    await setupPeerConnection();
  }, [sessionId, setupPeerConnection, ensureChannel]);

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
      const nowMuted = !audioTrack.enabled;
      setIsMuted(nowMuted);
      if (!nowMuted) {
        // Unmuting also clears deafen
        setIsDeafened(false);
        remoteAudiosRef.current.forEach((a) => { a.muted = false; });
      }
    }
  }, []);

  const toggleDeafen = useCallback(() => {
    setIsDeafened((prev) => {
      const next = !prev;
      remoteAudiosRef.current.forEach((a) => { a.muted = next; });
      if (next) {
        // Deafening also mutes
        localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false; });
        setIsMuted(true);
      } else {
        // Undeafening also unmutes
        localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = true; });
        setIsMuted(false);
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
      if (statsIntervalRef.current) { clearInterval(statsIntervalRef.current); statsIntervalRef.current = null; }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []);

  return {
    callState,
    isMuted,
    isDeafened,
    callDuration,
    isScreenSharing,
    localScreenStream,
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
    adjustScreenShareQuality,
    startCamera,
    stopCamera,
  };
}
