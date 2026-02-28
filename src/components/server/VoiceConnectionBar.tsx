import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

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
      audioCtx.close().catch(() => { });
    },
  };
}

/** Optimize SDP for gaming: inject bitrate limits and x-google encoder params */
function optimizeSDPForGaming(sdp: string, maxKbps = 10000, startKbps = 4000, minKbps = 2000): string {
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

interface VoiceConnectionManagerProps {
  channelId: string;
  channelName: string;
  serverId: string;
  onDisconnect: () => void;
}

/** Headless component — manages WebRTC voice connection with no visible UI */
const VoiceConnectionManager = ({ channelId, channelName, serverId, onDisconnect }: VoiceConnectionManagerProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { globalMuted, globalDeafened, setGlobalMuted, setGlobalDeafened } = useAudioSettings();
  const { isScreenSharing, setIsScreenSharing, setRemoteScreenStream, setScreenSharerName, isCameraOn, setIsCameraOn, setLocalCameraStream, setRemoteCameraStream, voiceChannel, setVoiceChannel, setNativeResolutionLabel } = useVoiceChannel();
  const [isJoined, setIsJoined] = useState(false);
  const [inactiveChannelId, setInactiveChannelId] = useState<string | null>(null);
  const [inactiveTimeout, setInactiveTimeout] = useState<number | null>(null);
  const [inactiveChannelName, setInactiveChannelName] = useState("AFK");
  const afkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudiosRef = useRef<HTMLAudioElement[]>([]);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const volumeMonitorsRef = useRef<Array<{ cleanup: () => void }>>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenSendersRef = useRef<Map<string, RTCRtpSender>>(new Map());
  const screenAudioSendersRef = useRef<Map<string, RTCRtpSender>>(new Map());
  const statsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraSendersRef = useRef<Map<string, RTCRtpSender>>(new Map());
  const remoteCameraExpectedRef = useRef<Set<string>>(new Set());
  const remoteScreenStreamIdsRef = useRef<Set<string>>(new Set());
  const audiosByStreamIdRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const lastSpeakingRef = useRef<boolean>(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      onDisconnect(); // auto-disconnect after 1 hour idle
    }, 60 * 60 * 1000);
  }, [onDisconnect]);

  // Enforce AFK audio state
  useEffect(() => {
    if (inactiveChannelId && channelId === inactiveChannelId) {
      if (!globalMuted) setGlobalMuted(true);
      if (!globalDeafened) setGlobalDeafened(true);
    }
  }, [channelId, inactiveChannelId, globalMuted, globalDeafened, setGlobalMuted, setGlobalDeafened]);

  // Fetch AFK settings when connected
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

  const resetAfkTimer = useCallback(() => {
    if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
    if (!inactiveChannelId || !inactiveTimeout) return;
    if (channelId === inactiveChannelId) return; // already in AFK channel
    afkTimerRef.current = setTimeout(() => {
      toast.info(t("voice.movedToAfk"));
      setVoiceChannel({ id: inactiveChannelId, name: inactiveChannelName, serverId });
    }, inactiveTimeout * 60 * 1000);
  }, [inactiveChannelId, inactiveTimeout, inactiveChannelName, channelId, serverId, setVoiceChannel, t]);

  // Listen for soundboard play events dispatched by ChannelSidebar
  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent).detail?.url;
      if (!url) return;
      channelRef.current?.send({ type: "broadcast", event: "soundboard_play", payload: { sound_url: url } });
    };
    window.addEventListener("play-soundboard", handler);
    return () => window.removeEventListener("play-soundboard", handler);
  }, []);

  const updateSpeaking = useCallback((userId: string, isSpeaking: boolean) => {
    if (lastSpeakingRef.current === isSpeaking) return;
    lastSpeakingRef.current = isSpeaking;
    if (isSpeaking && userId === user?.id) {
      resetIdleTimer();
      resetAfkTimer();
    }
    supabase
      .from("voice_channel_participants" as any)
      .update({ is_speaking: isSpeaking } as any)
      .eq("channel_id", channelId)
      .eq("user_id", userId)
      .then();
  }, [channelId, user?.id, resetIdleTimer, resetAfkTimer]);

  const createPeerConnection = useCallback((peerId: string) => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    peerConnectionsRef.current.set(peerId, pc);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
    }
    // If already screen sharing, add the video track to the new peer
    if (screenStreamRef.current) {
      const videoTrack = screenStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.contentHint = 'motion';
        const transceiver = pc.addTransceiver(videoTrack, {
          direction: 'sendonly',
          streams: [screenStreamRef.current],
          sendEncodings: [{ maxBitrate: 8_000_000, maxFramerate: 60, priority: 'high' }],
        });
        screenSendersRef.current.set(peerId, transceiver.sender);
        try {
          const caps = (RTCRtpReceiver as any).getCapabilities?.('video');
          if (caps?.codecs) {
            const h264Hi = caps.codecs.filter((c: any) => c.mimeType === 'video/H264' && c.sdpFmtpLine?.includes('profile-level-id=64'));
            const h264Rst = caps.codecs.filter((c: any) => c.mimeType === 'video/H264' && !c.sdpFmtpLine?.includes('profile-level-id=64'));
            const other = caps.codecs.filter((c: any) => c.mimeType !== 'video/H264');
            transceiver.setCodecPreferences([...h264Hi, ...h264Rst, ...other]);
          }
        } catch { }
        try {
          const p = transceiver.sender.getParameters();
          if (p.encodings?.length) { p.degradationPreference = 'maintain-framerate'; transceiver.sender.setParameters(p); }
        } catch { }
      }
      // Also add the audio track if screen share has one
      const screenAudioTracks = screenStreamRef.current.getAudioTracks();
      if (screenAudioTracks.length > 0) {
        const audioSender = pc.addTrack(screenAudioTracks[0], screenStreamRef.current);
        screenAudioSendersRef.current.set(`${peerId}-audio`, audioSender);
      }
    }
    // If already camera sharing, add the video track to the new peer
    if (cameraStreamRef.current) {
      const videoTrack = cameraStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const sender = pc.addTrack(videoTrack, cameraStreamRef.current);
        cameraSendersRef.current.set(peerId, sender);
        try {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
          params.encodings[0].maxBitrate = 4_000_000;
          (params as any).degradationPreference = "maintain-resolution";
          sender.setParameters(params);
        } catch { }
      }
    }
    pc.ontrack = (e) => {
      if (e.track.kind === "video") {
        if (remoteCameraExpectedRef.current.has(peerId)) {
          remoteCameraExpectedRef.current.delete(peerId);
          setRemoteCameraStream(e.streams[0]);
          e.track.onended = () => setRemoteCameraStream(null);
        } else {
          // Remote screen share — tag stream ID so audio handler skips it
          const screenStreamId = e.streams[0]?.id;
          if (screenStreamId) {
            remoteScreenStreamIdsRef.current.add(screenStreamId);
            // If screen audio arrived before video and was wrongly played globally, stop it
            const wrongAudio = audiosByStreamIdRef.current.get(screenStreamId);
            if (wrongAudio) {
              wrongAudio.pause();
              wrongAudio.srcObject = null;
              remoteAudiosRef.current = remoteAudiosRef.current.filter(a => a !== wrongAudio);
              audiosByStreamIdRef.current.delete(screenStreamId);
            }
          }
          setRemoteScreenStream(e.streams[0]);
          e.track.onended = () => {
            if (screenStreamId) remoteScreenStreamIdsRef.current.delete(screenStreamId);
            setRemoteScreenStream(null);
          };
        }
      } else {
        // Skip screen-share audio — ScreenShareViewer plays it via the video element
        const streamId = e.streams[0]?.id;
        const isScreenAudio =
          (streamId && remoteScreenStreamIdsRef.current.has(streamId)) ||
          (e.streams[0]?.getVideoTracks().length ?? 0) > 0;
        if (isScreenAudio) {
          if (streamId) remoteScreenStreamIdsRef.current.add(streamId);
          return;
        }
        // Mic audio — play globally and monitor for speaking detection
        const audio = new Audio();
        audio.srcObject = e.streams[0];
        audio.muted = globalDeafened;
        audio.play().catch(() => { });
        remoteAudiosRef.current.push(audio);
        if (streamId) audiosByStreamIdRef.current.set(streamId, audio);
        const monitor = createVolumeMonitor(e.streams[0], (isSpeaking) => {
          updateSpeaking(peerId, isSpeaking);
        });
        volumeMonitorsRef.current.push(monitor);
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate && user) {
        channelRef.current?.send({
          type: "broadcast", event: "voice-ice",
          payload: { candidate: e.candidate, senderId: user.id, targetId: peerId },
        });
      }
    };
    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        const patchedSdp = optimizeSDPForGaming(offer.sdp || "");
        await pc.setLocalDescription({ ...offer, sdp: patchedSdp });
        channelRef.current?.send({
          type: "broadcast", event: "voice-offer",
          payload: { sdp: { ...offer, sdp: patchedSdp }, senderId: user!.id, targetId: peerId },
        });
      } catch { }
    };
    return pc;
  }, [user, updateSpeaking, setRemoteScreenStream, setRemoteCameraStream]);

  // Screen share toggle handler
  const startScreenShare = useCallback(async (settings?: { resolution?: "720p" | "1080p" | "source"; fps?: 30 | 60; surface?: "monitor" | "window"; sourceId?: string }) => {
    if (screenStreamRef.current) return;
    const res = settings?.resolution ?? "1080p";
    const fps = settings?.fps ?? 60;
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
          audio: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: sourceId,
            },
          } as any,
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
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        });
      }
      screenStreamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];
      videoTrack.contentHint = 'motion';
      // For source resolution, skip resolution-capping applyConstraints — only enforce framerate
      if (res !== "source") {
        try {
          await videoTrack.applyConstraints({ frameRate: { min: 30, ideal: fps } });
        } catch { }
      }

      // Expose resolution label to the UI.
      // For source resolution, detect native size from the actual captured track.
      // For 720p / 1080p, use the selected preset directly — getSettings() may
      // return the monitor's native size before constraints fully take effect.
      const resLabel: string | null = res === "source"
        ? (() => {
            const { width: tw = 0, height: th = 0 } = videoTrack.getSettings();
            return tw >= 3840 || th >= 2160 ? "4K"
                 : tw >= 2560 || th >= 1440 ? "2K"
                 : th >= 1080 ? "1080p"
                 : th >= 720  ? "720p"
                 : th > 0     ? `${th}p`
                 : null;
          })()
        : res; // "720p" or "1080p" — display exactly what the user selected
      setNativeResolutionLabel(resLabel);

      // Add track to all peer connections with gaming-quality settings
      const bitrate =
        res === "720p"    ? 6_000_000   // 6 Mbps
        : res === "1080p" ? 15_000_000  // 15 Mbps
        :                   25_000_000; // 25 Mbps — source (2K/4K@60fps)
      for (const [peerId, pc] of peerConnectionsRef.current) {
        const transceiver = pc.addTransceiver(videoTrack, {
          direction: 'sendonly',
          streams: [stream],
          sendEncodings: [{ maxBitrate: bitrate, maxFramerate: fps, priority: 'high' }],
        });
        screenSendersRef.current.set(peerId, transceiver.sender);
        try {
          const caps = (RTCRtpReceiver as any).getCapabilities?.('video');
          if (caps?.codecs) {
            const h264Hi = caps.codecs.filter((c: any) => c.mimeType === 'video/H264' && c.sdpFmtpLine?.includes('profile-level-id=64'));
            const h264Rst = caps.codecs.filter((c: any) => c.mimeType === 'video/H264' && !c.sdpFmtpLine?.includes('profile-level-id=64'));
            const other = caps.codecs.filter((c: any) => c.mimeType !== 'video/H264');
            transceiver.setCodecPreferences([...h264Hi, ...h264Rst, ...other]);
          }
        } catch { }
        try {
          const p = transceiver.sender.getParameters();
          if (p.encodings?.length) { p.degradationPreference = 'maintain-framerate'; await transceiver.sender.setParameters(p); }
        } catch { }
      }

      // Add audio track to all peer connections (if system audio was captured)
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        for (const [peerId, pc] of peerConnectionsRef.current) {
          const audioSender = pc.addTrack(audioTracks[0], stream);
          screenAudioSendersRef.current.set(peerId, audioSender);
        }
        console.log('[ScreenShare] Audio track active');
      } else {
        console.log('[ScreenShare] No system audio captured — platform may not support it');
      }

      setIsScreenSharing(true);

      if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = setInterval(async () => {
        const [firstEntry] = screenSendersRef.current.entries();
        if (!firstEntry) return;
        const [peerId, sender] = firstEntry;
        const pc = peerConnectionsRef.current.get(peerId);
        if (!pc || !sender.track) return;
        try {
          const stats = await pc.getStats(sender.track);
          stats.forEach((report: any) => {
            if (report.type === 'outbound-rtp' && report.kind === 'video') {
              console.log('[ScreenShare] fps:', report.framesPerSecond, 'w:', report.frameWidth, 'h:', report.frameHeight, 'limitReason:', report.qualityLimitationReason);
            }
          });
        } catch { }
      }, 5000);

      // Update is_screen_sharing in DB
      if (user) {
        supabase
          .from("voice_channel_participants" as any)
          .update({ is_screen_sharing: true } as any)
          .eq("channel_id", channelId)
          .eq("user_id", user.id)
          .then();
      }

      // Broadcast that we started sharing
      channelRef.current?.send({
        type: "broadcast", event: "voice-screen-share",
        payload: { userId: user!.id, sharing: true },
      });

      videoTrack.onended = () => {
        stopScreenShare();
      };
    } catch {
      // User cancelled
    }
  }, [user, setIsScreenSharing]);

  const stopScreenShare = useCallback(() => {
    if (statsIntervalRef.current) { clearInterval(statsIntervalRef.current); statsIntervalRef.current = null; }
    setNativeResolutionLabel(null);
    // Remove senders from peer connections
    peerConnectionsRef.current.forEach((pc, peerId) => {
      const sender = screenSendersRef.current.get(peerId);
      if (sender) { try { pc.removeTrack(sender); } catch { } }
      const audioSender = screenAudioSendersRef.current.get(peerId);
      if (audioSender) { try { pc.removeTrack(audioSender); } catch { } }
      const audioSender2 = screenAudioSendersRef.current.get(`${peerId}-audio`);
      if (audioSender2) { try { pc.removeTrack(audioSender2); } catch { } }
    });
    screenSendersRef.current.clear();
    screenAudioSendersRef.current.clear();
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);

    // Update is_screen_sharing in DB
    if (user) {
      supabase
        .from("voice_channel_participants" as any)
        .update({ is_screen_sharing: false } as any)
        .eq("channel_id", channelId)
        .eq("user_id", user.id)
        .then();
    }

    channelRef.current?.send({
      type: "broadcast", event: "voice-screen-share",
      payload: { userId: user?.id, sharing: false },
    });
  }, [user, setIsScreenSharing]);

  // Camera
  const startCamera = useCallback(async () => {
    if (cameraStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } },
      });
      cameraStreamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];

      for (const [peerId, pc] of peerConnectionsRef.current) {
        const sender = pc.addTrack(videoTrack, stream);
        cameraSendersRef.current.set(peerId, sender);
        try {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
          params.encodings[0].maxBitrate = 4_000_000;
          (params as any).degradationPreference = "maintain-resolution";
          await sender.setParameters(params);
        } catch { }
      }

      setIsCameraOn(true);
      setLocalCameraStream(stream);

      channelRef.current?.send({
        type: "broadcast", event: "voice-camera",
        payload: { userId: user!.id, sharing: true },
      });

      videoTrack.onended = () => stopCamera();
    } catch {
      // Camera permission denied
    }
  }, [user, setIsCameraOn, setLocalCameraStream]);

  const stopCamera = useCallback(() => {
    peerConnectionsRef.current.forEach((pc, peerId) => {
      const sender = cameraSendersRef.current.get(peerId);
      if (sender) {
        try { pc.removeTrack(sender); } catch { }
      }
    });
    cameraSendersRef.current.clear();
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    setIsCameraOn(false);
    setLocalCameraStream(null);

    channelRef.current?.send({
      type: "broadcast", event: "voice-camera",
      payload: { userId: user?.id, sharing: false },
    });
  }, [user, setIsCameraOn, setLocalCameraStream]);

  // Listen for screen share custom events from ChannelSidebar
  useEffect(() => {
    const startHandler = (e: Event) => {
      const settings = (e as CustomEvent).detail;
      startScreenShare(settings);
    };
    const stopHandler = () => stopScreenShare();
    window.addEventListener("start-screen-share", startHandler);
    window.addEventListener("stop-screen-share", stopHandler);
    return () => {
      window.removeEventListener("start-screen-share", startHandler);
      window.removeEventListener("stop-screen-share", stopHandler);
    };
  }, [startScreenShare, stopScreenShare]);

  // Listen for toggle-camera custom event from ChannelSidebar
  useEffect(() => {
    const handler = () => {
      if (cameraStreamRef.current) {
        stopCamera();
      } else {
        startCamera();
      }
    };
    window.addEventListener("toggle-camera", handler);
    return () => window.removeEventListener("toggle-camera", handler);
  }, [startCamera, stopCamera]);

  const setupSignaling = useCallback(() => {
    if (channelRef.current) return;
    const ch = supabase.channel(`voice-signal-${channelId}`);
    channelRef.current = ch;
    ch.on("broadcast", { event: "voice-offer" }, async ({ payload }) => {
      if (!user || payload.targetId !== user.id) return;
      let pc = peerConnectionsRef.current.get(payload.senderId);
      if (!pc) {
        pc = createPeerConnection(payload.senderId);
      }
      await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
      const answer = await pc.createAnswer();
      const patchedAnswer = optimizeSDPForGaming(answer.sdp || "");
      await pc.setLocalDescription({ ...answer, sdp: patchedAnswer });
      ch.send({ type: "broadcast", event: "voice-answer", payload: { sdp: { ...answer, sdp: patchedAnswer }, senderId: user.id, targetId: payload.senderId } });
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
      .on("broadcast", { event: "voice-screen-share" }, ({ payload }) => {
        if (payload.userId === user?.id) return;
        if (!payload.sharing) {
          setRemoteScreenStream(null);
          setScreenSharerName(null);
        }
      })
      .on("broadcast", { event: "voice-camera" }, ({ payload }) => {
        if (payload.userId === user?.id) return;
        if (payload.sharing) {
          remoteCameraExpectedRef.current.add(payload.userId);
        } else {
          setRemoteCameraStream(null);
        }
      })
      .on("broadcast", { event: "soundboard_play" }, ({ payload }) => {
        if (!payload?.sound_url) return;
        const audio = new Audio(payload.sound_url);
        audio.volume = 0.7;
        audio.play().catch(() => { });
      })
      .subscribe();
  }, [channelId, user, createPeerConnection, setRemoteScreenStream, setScreenSharerName, setRemoteCameraStream]);

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
        if (mounted) {
          setIsJoined(true);
          window.dispatchEvent(new CustomEvent("voice-participants-changed"));
        }

        // Broadcast entrance sound if set
        if (serverId) {
          const { data: memberData } = await supabase
            .from("server_members" as any)
            .select("entrance_sound_id, server_soundboard!entrance_sound_id(url)")
            .eq("server_id", serverId)
            .eq("user_id", user.id)
            .maybeSingle();
          const entranceSoundUrl = (memberData as any)?.server_soundboard?.url;
          if (entranceSoundUrl) {
            channelRef.current?.send({
              type: "broadcast",
              event: "soundboard_play",
              payload: { sound_url: entranceSoundUrl },
            });
          }
        }

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

    // Start idle timer on join
    resetIdleTimer();

    return () => {
      mounted = false;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
    };
  }, [channelId, user, setupSignaling, createPeerConnection, updateSpeaking, resetIdleTimer]);

  // Start or restart AFK timer when settings load or change
  useEffect(() => {
    resetAfkTimer();
    return () => {
      if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
    };
  }, [resetAfkTimer]);

  // Mute: toggle local audio tracks
  useEffect(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !globalMuted; });
  }, [globalMuted]);

  // Deafen: mute/unmute all remote audio elements
  useEffect(() => {
    remoteAudiosRef.current.forEach(a => { a.muted = globalDeafened; });
  }, [globalDeafened]);

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

  // Cleanup on unmount (disconnect)
  useEffect(() => {
    return () => {
      if (statsIntervalRef.current) { clearInterval(statsIntervalRef.current); statsIntervalRef.current = null; }
      // Stop screen share
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      screenSendersRef.current.clear();
      screenAudioSendersRef.current.clear();
      setIsScreenSharing(false);
      setRemoteScreenStream(null);
      setScreenSharerName(null);

      // Stop camera
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
      cameraSendersRef.current.clear();
      setIsCameraOn(false);
      setLocalCameraStream(null);
      setRemoteCameraStream(null);

      volumeMonitorsRef.current.forEach((m) => m.cleanup());
      volumeMonitorsRef.current = [];
      remoteScreenStreamIdsRef.current.clear();
      audiosByStreamIdRef.current.clear();
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
