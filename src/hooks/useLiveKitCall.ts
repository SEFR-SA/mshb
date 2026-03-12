import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLiveKitRoom } from "@/hooks/useLiveKitRoom";
import { dmCallRoom } from "@/lib/livekit";
import { Track } from "livekit-client";

export type CallState = "idle" | "ringing" | "connecting" | "connected" | "ended";

interface UseLiveKitCallOptions {
  sessionId: string | null;
  isCaller: boolean;
  onEnded?: () => void;
  initialMuted?: boolean;
  initialDeafened?: boolean;
}

/**
 * DM call hook powered by LiveKit.
 * API-compatible drop-in replacement for the old useWebRTC hook.
 */
export function useLiveKitCall({
  sessionId,
  isCaller,
  onEnded,
  initialMuted = false,
  initialDeafened = false,
}: UseLiveKitCallOptions) {
  const { user } = useAuth();
  const displayName =
    (user as any)?.user_metadata?.display_name ??
    user?.email?.split("@")[0] ??
    "User";

  const [callState, setCallState] = useState<CallState>("idle");
  const hasConnectedRef = useRef(false);
  const endedRef = useRef(false);
  const sessionIdRef = useRef(sessionId);
  sessionIdRef.current = sessionId;

  const lk = useLiveKitRoom({
    roomName: sessionId ? dmCallRoom(sessionId) : "",
    participantName: displayName,
    participantIdentity: user?.id ?? "",
    initialMuted,
    initialDeafened,
    onDisconnected: () => {
      if (!endedRef.current) {
        endedRef.current = true;
        setCallState("ended");
        onEnded?.();
      }
    },
  });

  // ── Sync LiveKit connected → local state ──────────────────────────────────

  useEffect(() => {
    if (lk.callState === "connected" && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
      setCallState("connected");
    }
  }, [lk.callState]);

  // Note: call_sessions status monitoring is handled by CallListener.tsx
  // to avoid duplicate onEnded callbacks and double system messages.

  // ── Reset state when sessionId changes (new call or cleared) ──────────────

  useEffect(() => {
    if (!sessionId) {
      // Session cleared — reset to idle
      if (callState !== "idle" && callState !== "ended") {
        lk.disconnect();
      }
      setCallState("idle");
      hasConnectedRef.current = false;
      endedRef.current = false;
    }
  }, [sessionId]);

  // ── Start call (caller) ───────────────────────────────────────────────────

  const startCall = useCallback(
    async (overrideSessionId?: string) => {
      const sid = overrideSessionId || sessionId;
      if (!sid || !user) return;
      endedRef.current = false;
      hasConnectedRef.current = false;
      setCallState("ringing");
      await lk.connect();
    },
    [sessionId, user, lk]
  );

  // ── Answer call (callee) ──────────────────────────────────────────────────

  const answerCall = useCallback(
    async (overrideSessionId?: string) => {
      const sid = overrideSessionId || sessionId;
      if (!sid || !user) return;
      endedRef.current = false;
      hasConnectedRef.current = false;
      setCallState("ringing");
      await lk.connect();
    },
    [sessionId, user, lk]
  );

  // ── End call ──────────────────────────────────────────────────────────────

  const endCall = useCallback(() => {
    endedRef.current = true;
    lk.disconnect();
    setCallState("ended");
    onEnded?.();
  }, [lk, onEnded]);

  // ── Screen share ──────────────────────────────────────────────────────────

  const startScreenShare = useCallback(
    async (settings?: {
      resolution?: "720p" | "1080p" | "source";
      fps?: 30 | 60;
      sourceId?: string;
      isPro?: boolean;
    }) => {
      await lk.startScreenShare({
        resolution: settings?.resolution,
        fps: settings?.fps,
        sourceId: settings?.sourceId,
      });
    },
    [lk]
  );

  const stopScreenShare = useCallback(async () => {
    await lk.stopScreenShare();
  }, [lk]);

  // ── Camera ────────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    await lk.startCamera();
  }, [lk]);

  const stopCamera = useCallback(async () => {
    await lk.stopCamera();
  }, [lk]);

  // ── Local screen stream ───────────────────────────────────────────────────

  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!lk.isScreenSharing) {
      setLocalScreenStream(null);
      return;
    }
    const room = lk.room.current;
    if (!room) return;
    const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    if (pub?.track?.mediaStream) {
      setLocalScreenStream(pub.track.mediaStream);
    }
  }, [lk.isScreenSharing, lk.room]);

  // ── Remote streams ────────────────────────────────────────────────────────

  const remoteScreenStream =
    lk.remoteScreenStreams.length > 0 ? lk.remoteScreenStreams[0].stream : null;
  const remoteCameraStream =
    lk.remoteCameraStreams.length > 0 ? lk.remoteCameraStreams[0].stream : null;

  // ── Local camera stream ───────────────────────────────────────────────────

  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!lk.isCameraOn) {
      setLocalCameraStream(null);
      return;
    }
    const room = lk.room.current;
    if (!room) return;
    const pub = room.localParticipant.getTrackPublication(Track.Source.Camera);
    if (pub?.track?.mediaStream) {
      setLocalCameraStream(pub.track.mediaStream);
    }
  }, [lk.isCameraOn, lk.room]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      lk.disconnect();
    };
  }, []);

  return {
    callState,
    isMuted: lk.isMuted,
    isDeafened: lk.isDeafened,
    callDuration: lk.callDuration,
    isScreenSharing: lk.isScreenSharing,
    localScreenStream,
    remoteScreenStream,
    isCameraOn: lk.isCameraOn,
    localCameraStream,
    remoteCameraStream,
    startCall,
    answerCall,
    endCall,
    toggleMute: lk.toggleMute,
    toggleDeafen: lk.toggleDeafen,
    startScreenShare,
    stopScreenShare,
    startCamera,
    stopCamera,
  };
}
