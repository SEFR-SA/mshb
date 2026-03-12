import { useCallback, useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  Track,
  RemoteParticipant,
  RemoteTrackPublication,
  LocalParticipant,
  ConnectionState,
  DisconnectReason,
  VideoPresets,
  type AudioCaptureOptions,
  type VideoCaptureOptions,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
} from "livekit-client";
import { fetchLiveKitToken } from "@/lib/livekit";
import { BOOST_PERKS } from "@/config/boostPerks";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallState = "idle" | "connecting" | "connected" | "ended";

export interface ParticipantInfo {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  /** The raw RemoteParticipant for advanced usage (volume control etc.) */
  participant?: RemoteParticipant;
}

export interface LiveKitRoomOptions {
  /** Room name (use serverVoiceRoom / dmCallRoom helpers). */
  roomName: string;
  /** Display name sent to other participants. */
  participantName: string;
  /** Unique identity (usually userId). */
  participantIdentity: string;
  /** Start with mic muted? */
  initialMuted?: boolean;
  /** Start deafened? */
  initialDeafened?: boolean;
  /** Called when disconnected (by server or network loss). */
  onDisconnected?: (reason?: DisconnectReason) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiveKitRoom({
  roomName,
  participantName,
  participantIdentity,
  initialMuted = false,
  initialDeafened = false,
  onDisconnected,
}: LiveKitRoomOptions) {
  const roomRef = useRef<Room | null>(null);

  const [callState, setCallState] = useState<CallState>("idle");
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isDeafened, setIsDeafened] = useState(initialDeafened);
  const [callDuration, setCallDuration] = useState(0);
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string>>(new Set());
  const activeSpeakersRef = useRef<Set<string>>(new Set());
  const [metadata, setMetadata] = useState<{ isPro: boolean; boostLevel: number } | null>(null);

  // Screen share state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<
    { identity: string; name: string; stream: MediaStream }[]
  >([]);

  // Camera state
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [remoteCameraStreams, setRemoteCameraStreams] = useState<
    { identity: string; stream: MediaStream }[]
  >([]);

  const durationRef = useRef<ReturnType<typeof setInterval>>();

  // Keep ref in sync with state
  useEffect(() => {
    activeSpeakersRef.current = activeSpeakers;
  }, [activeSpeakers]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Rebuild the participants list from the current room state. */
  const syncParticipants = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;

    const speakers = activeSpeakersRef.current;
    const list: ParticipantInfo[] = [];
    room.remoteParticipants.forEach((p) => {
      list.push({
        identity: p.identity,
        name: p.name ?? p.identity,
        isSpeaking: speakers.has(p.identity),
        isMuted: p.getTrackPublication(Track.Source.Microphone)?.isMuted ?? true,
        participant: p,
      });
    });
    setParticipants(list);
  }, []);

  /** Rebuild remote screen share streams from current room. */
  const syncScreenShares = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const streams: { identity: string; name: string; stream: MediaStream }[] = [];
    room.remoteParticipants.forEach((p) => {
      const pub = p.getTrackPublication(Track.Source.ScreenShare);
      if (pub?.track?.mediaStream) {
        streams.push({
          identity: p.identity,
          name: p.name ?? p.identity,
          stream: pub.track.mediaStream,
        });
      }
    });
    setRemoteScreenStreams(streams);
  }, []);

  /** Rebuild remote camera streams. */
  const syncCameras = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const streams: { identity: string; stream: MediaStream }[] = [];
    room.remoteParticipants.forEach((p) => {
      const pub = p.getTrackPublication(Track.Source.Camera);
      if (pub?.track?.mediaStream) {
        streams.push({ identity: p.identity, stream: pub.track.mediaStream });
      }
    });
    setRemoteCameraStreams(streams);
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────────

  const connect = useCallback(async () => {
    if (roomRef.current) return; // already connected
    if (!roomName) return; // no room to connect to
    setCallState("connecting");

    try {
      const { token, wsUrl } = await fetchLiveKitToken(
        roomName,
        participantName,
        participantIdentity
      );

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        // Audio output will respect per-user volume set via setVolume()
      });

      roomRef.current = room;

      // ── Event handlers ──────────────────────────────────────────────────

      room.on(RoomEvent.Connected, () => {
        setCallState("connected");

        // Parse metadata embedded by the edge function
        const local = room.localParticipant;
        if (local.metadata) {
          try {
            const m = JSON.parse(local.metadata);
            setMetadata({ isPro: m.isPro ?? false, boostLevel: m.boostLevel ?? 0 });
          } catch {}
        }

        // Start duration timer
        const start = Date.now();
        durationRef.current = setInterval(() => {
          setCallDuration(Math.floor((Date.now() - start) / 1000));
        }, 1000);
      });

      room.on(RoomEvent.Disconnected, (reason) => {
        setCallState("ended");
        onDisconnected?.(reason);
      });

      room.on(RoomEvent.ParticipantConnected, () => syncParticipants());
      room.on(RoomEvent.ParticipantDisconnected, () => {
        syncParticipants();
        syncScreenShares();
        syncCameras();
      });

      room.on(RoomEvent.TrackSubscribed, (_track, _pub, _participant) => {
        syncParticipants();
        syncScreenShares();
        syncCameras();
      });

      room.on(RoomEvent.TrackUnsubscribed, () => {
        syncParticipants();
        syncScreenShares();
        syncCameras();
      });

      room.on(RoomEvent.TrackMuted, () => syncParticipants());
      room.on(RoomEvent.TrackUnmuted, () => syncParticipants());

      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const ids = new Set(speakers.map((s) => s.identity));
        setActiveSpeakers(ids);
      });

      // Connect
      await room.connect(wsUrl, token);

      // Publish microphone (respecting initial mute) with boost-level audio bitrate
      const localMeta = room.localParticipant.metadata;
      let audioBitrate = 96_000; // default 96kbps
      if (localMeta) {
        try {
          const m = JSON.parse(localMeta);
          const bl = Math.min(Math.max(Math.floor(m.boostLevel ?? 0), 0), 3) as 0 | 1 | 2 | 3;
          audioBitrate = BOOST_PERKS[bl].audioQualityKbps * 1000;
        } catch {}
      }

      await room.localParticipant.setMicrophoneEnabled(!initialMuted, undefined, {
        audioPreset: { maxBitrate: audioBitrate },
      } as TrackPublishOptions);

      syncParticipants();
    } catch (err) {
      console.error("[LiveKit] connection failed:", err);
      setCallState("ended");
      roomRef.current = null;
    }
  }, [
    roomName,
    participantName,
    participantIdentity,
    initialMuted,
    onDisconnected,
    syncParticipants,
    syncScreenShares,
    syncCameras,
  ]);

  // ── Disconnect ────────────────────────────────────────────────────────────

  const disconnect = useCallback(() => {
    if (durationRef.current) clearInterval(durationRef.current);
    roomRef.current?.disconnect();
    roomRef.current = null;
    setCallState("ended");
    setCallDuration(0);
    setParticipants([]);
    setActiveSpeakers(new Set());
    setIsScreenSharing(false);
    setRemoteScreenStreams([]);
    setIsCameraOn(false);
    setRemoteCameraStreams([]);
    setMetadata(null);
  }, []);

  // ── Mute / Deafen ─────────────────────────────────────────────────────────

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const next = !isMuted;
    await room.localParticipant.setMicrophoneEnabled(!next);
    setIsMuted(next);
  }, [isMuted]);

  const toggleDeafen = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const next = !isDeafened;

    // Mute/unmute all remote audio tracks
    room.remoteParticipants.forEach((p) => {
      const audioPub = p.getTrackPublication(Track.Source.Microphone);
      if (audioPub?.track) {
        (audioPub.track as any).mediaStreamTrack.enabled = !next;
      }
    });

    setIsDeafened(next);
    // If deafening, also mute self
    if (next && !isMuted) {
      room.localParticipant.setMicrophoneEnabled(false);
      setIsMuted(true);
    }
  }, [isDeafened, isMuted]);

  // ── Per-user volume ───────────────────────────────────────────────────────

  const setUserVolume = useCallback((identity: string, volume: number) => {
    const room = roomRef.current;
    if (!room) return;
    const p = room.remoteParticipants.get(identity);
    if (!p) return;
    const pub = p.getTrackPublication(Track.Source.Microphone);
    if (pub?.track) {
      // LiveKit volume: 0-1 (we accept 0-200 and normalize)
      (pub.track as any).setVolume?.(volume / 100);
    }
  }, []);

  // ── Screen Share ──────────────────────────────────────────────────────────

  const startScreenShare = useCallback(
    async (opts?: {
      resolution?: "720p" | "1080p" | "source";
      fps?: 30 | 60;
      sourceId?: string;
    }) => {
      const room = roomRef.current;
      if (!room) return;

      const isPro = metadata?.isPro ?? false;

      // Build capture options with tier enforcement
      let width = 1920;
      let height = 1080;
      let maxFramerate = 30;

      if (opts?.resolution === "720p") {
        width = 1280;
        height = 720;
      } else if (opts?.resolution === "source") {
        if (isPro) {
          width = 3840;
          height = 2160;
        }
        // Free users are capped at 1080p regardless
      }

      if (opts?.fps === 60) {
        // Free users can only do 60fps at 720p
        if (isPro || opts?.resolution === "720p") {
          maxFramerate = 60;
        }
      }

      const captureOptions: ScreenShareCaptureOptions = {
        resolution: { width, height, frameRate: maxFramerate },
      };

      // Electron: use desktopCapturer sourceId
      if (opts?.sourceId) {
        (captureOptions as any).preferCurrentTab = false;
        // For Electron, we pass a custom constraint via mandatory
        (captureOptions as any).mandatory = {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: opts.sourceId,
        };
      }

      try {
        await room.localParticipant.setScreenShareEnabled(true, captureOptions, {
          videoCodec: "vp8",
          videoEncoding: {
            maxBitrate: isPro ? 8_000_000 : 4_000_000,
            maxFramerate,
          },
        });
        setIsScreenSharing(true);

        // Listen for the screen share track ending (user clicks "Stop sharing")
        const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
        if (pub?.track) {
          pub.track.mediaStreamTrack.addEventListener("ended", () => {
            room.localParticipant.setScreenShareEnabled(false);
            setIsScreenSharing(false);
          });
        }
      } catch (err) {
        console.error("[LiveKit] screen share failed:", err);
      }
    },
    [metadata]
  );

  const stopScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setScreenShareEnabled(false);
    setIsScreenSharing(false);
  }, []);

  // ── Camera ────────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setCameraEnabled(true, {
      resolution: VideoPresets.h720.resolution,
      facingMode: "user",
    });
    setIsCameraOn(true);
  }, []);

  const stopCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setCameraEnabled(false);
    setIsCameraOn(false);
  }, []);

  // ── Audio Bitrate (boost-level aware) ─────────────────────────────────────

  const getAudioBitrate = useCallback(() => {
    const level = metadata?.boostLevel ?? 0;
    const clampedLevel = Math.min(Math.max(Math.floor(level), 0), 3) as 0 | 1 | 2 | 3;
    return BOOST_PERKS[clampedLevel].audioQualityKbps * 1000; // kbps → bps
  }, [metadata]);

  // ── DataChannel (for entrance sounds, soundboard etc.) ────────────────────

  const sendData = useCallback(
    (payload: Record<string, unknown>) => {
      const room = roomRef.current;
      if (!room) return;
      const encoder = new TextEncoder();
      room.localParticipant.publishData(encoder.encode(JSON.stringify(payload)), {
        reliable: true,
      });
    },
    []
  );

  const [lastDataMessage, setLastDataMessage] = useState<Record<string, unknown> | null>(null);

  // Wire up data received handler once room is created
  useEffect(() => {
    const room = roomRef.current;
    if (!room || callState !== "connected") return;

    const handleData = (
      payload: Uint8Array,
      participant?: RemoteParticipant
    ) => {
      try {
        const text = new TextDecoder().decode(payload);
        const data = JSON.parse(text);
        setLastDataMessage({ ...data, _from: participant?.identity });
      } catch {}
    };

    room.on(RoomEvent.DataReceived, handleData);
    return () => {
      room.off(RoomEvent.DataReceived, handleData);
    };
  }, [callState]);

  // ── Sync activeSpeakers into participants ─────────────────────────────────

  useEffect(() => {
    syncParticipants();
  }, [activeSpeakers, syncParticipants]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (durationRef.current) clearInterval(durationRef.current);
      roomRef.current?.disconnect();
      roomRef.current = null;
    };
  }, []);

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    // Connection
    connect,
    disconnect,
    callState,
    callDuration,
    room: roomRef,

    // Participants
    participants,
    activeSpeakers,

    // Mic
    isMuted,
    isDeafened,
    toggleMute,
    toggleDeafen,

    // Per-user volume
    setUserVolume,

    // Screen share
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
    remoteScreenStreams,

    // Camera
    isCameraOn,
    startCamera,
    stopCamera,
    remoteCameraStreams,

    // Metadata
    metadata,
    getAudioBitrate,

    // Data channel
    sendData,
    lastDataMessage,
  };
}
