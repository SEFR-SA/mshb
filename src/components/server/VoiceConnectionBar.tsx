import React, { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";

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
  const { isScreenSharing, setIsScreenSharing, setRemoteScreenStream, setScreenSharerName, isCameraOn, setIsCameraOn, setLocalCameraStream, setRemoteCameraStream } = useVoiceChannel();
  const [isJoined, setIsJoined] = useState(false);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudiosRef = useRef<HTMLAudioElement[]>([]);
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const channelRef = useRef<any>(null);
  const volumeMonitorsRef = useRef<Array<{ cleanup: () => void }>>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenSendersRef = useRef<Map<string, RTCRtpSender>>(new Map());
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraSendersRef = useRef<Map<string, RTCRtpSender>>(new Map());
  const remoteCameraExpectedRef = useRef<Set<string>>(new Set());

  const lastSpeakingRef = useRef<boolean>(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      onDisconnect(); // auto-disconnect after 1 hour idle
    }, 60 * 60 * 1000);
  }, [onDisconnect]);

  const updateSpeaking = useCallback((userId: string, isSpeaking: boolean) => {
    if (lastSpeakingRef.current === isSpeaking) return;
    lastSpeakingRef.current = isSpeaking;
    if (isSpeaking && userId === user?.id) {
      resetIdleTimer();
    }
    supabase
      .from("voice_channel_participants" as any)
      .update({ is_speaking: isSpeaking } as any)
      .eq("channel_id", channelId)
      .eq("user_id", userId)
      .then();
  }, [channelId, user?.id, resetIdleTimer]);

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
        const sender = pc.addTrack(videoTrack, screenStreamRef.current);
        screenSendersRef.current.set(peerId, sender);
        // Configure for source quality
        try {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
          params.encodings[0].maxBitrate = 8_000_000;
          (params as any).degradationPreference = "maintain-resolution";
          sender.setParameters(params);
        } catch {}
      }
    }
    // If already camera sharing, add the video track to the new peer
    if (cameraStreamRef.current) {
      const videoTrack = cameraStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        const sender = pc.addTrack(videoTrack, cameraStreamRef.current);
        cameraSendersRef.current.set(peerId, sender);
      }
    }
    pc.ontrack = (e) => {
      if (e.track.kind === "video") {
        if (remoteCameraExpectedRef.current.has(peerId)) {
          remoteCameraExpectedRef.current.delete(peerId);
          setRemoteCameraStream(e.streams[0]);
          e.track.onended = () => setRemoteCameraStream(null);
        } else {
          // Remote screen share
          setRemoteScreenStream(e.streams[0]);
          e.track.onended = () => setRemoteScreenStream(null);
        }
      } else {
        const audio = new Audio();
        audio.srcObject = e.streams[0];
        audio.muted = globalDeafened;
        audio.play().catch(() => {});
        remoteAudiosRef.current.push(audio);
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
        await pc.setLocalDescription(offer);
        channelRef.current?.send({
          type: "broadcast", event: "voice-offer",
          payload: { sdp: offer, senderId: user!.id, targetId: peerId },
        });
      } catch {}
    };
    return pc;
  }, [user, updateSpeaking, setRemoteScreenStream, setRemoteCameraStream]);

  // Screen share toggle handler
  const startScreenShare = useCallback(async () => {
    if (screenStreamRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 60 } },
        audio: false,
      });
      screenStreamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];

      // Add track to all peer connections and configure for source quality
      for (const [peerId, pc] of peerConnectionsRef.current) {
        const sender = pc.addTrack(videoTrack, stream);
        screenSendersRef.current.set(peerId, sender);
        try {
          const params = sender.getParameters();
          if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
          params.encodings[0].maxBitrate = 8_000_000;
          (params as any).degradationPreference = "maintain-resolution";
          await sender.setParameters(params);
        } catch {}
      }

      setIsScreenSharing(true);

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
    // Remove senders from peer connections
    peerConnectionsRef.current.forEach((pc, peerId) => {
      const sender = screenSendersRef.current.get(peerId);
      if (sender) {
        try { pc.removeTrack(sender); } catch {}
      }
    });
    screenSendersRef.current.clear();
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      cameraStreamRef.current = stream;
      const videoTrack = stream.getVideoTracks()[0];

      peerConnectionsRef.current.forEach((pc, peerId) => {
        const sender = pc.addTrack(videoTrack, stream);
        cameraSendersRef.current.set(peerId, sender);
      });

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
        try { pc.removeTrack(sender); } catch {}
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

  // Listen for toggle-screen-share custom event from ChannelSidebar
  useEffect(() => {
    const handler = () => {
      if (screenStreamRef.current) {
        stopScreenShare();
      } else {
        startScreenShare();
      }
    };
    window.addEventListener("toggle-screen-share", handler);
    return () => window.removeEventListener("toggle-screen-share", handler);
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

    // Start idle timer on join
    resetIdleTimer();

    return () => {
      mounted = false;
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [channelId, user, setupSignaling, createPeerConnection, updateSpeaking, resetIdleTimer]);

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
      // Stop screen share
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      screenSendersRef.current.clear();
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
