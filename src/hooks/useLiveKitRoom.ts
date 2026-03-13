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
  VideoPreset,
  VideoQuality,
  type AudioCaptureOptions,
  type VideoCaptureOptions,
  type TrackPublishOptions,
} from "livekit-client";
import { fetchLiveKitToken } from "@/lib/livekit";
import { BOOST_PERKS } from "@/config/boostPerks";
import type { StreamResolution } from "@/components/GoLiveModal";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CallState = "idle" | "connecting" | "connected" | "reconnecting" | "ended";

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

// ─── Screen Share Resolution Config ─────────────────────────────────────────

interface ScreenSharePreset {
  width: number;
  height: number;
  maxFps: number;
  maxBitrate: number; // bps
}

const SCREEN_SHARE_PRESETS: Record<StreamResolution, ScreenSharePreset> = {
  "720p":  { width: 1280, height: 720,  maxFps: 30, maxBitrate: 2_500_000 },
  "1080p": { width: 1920, height: 1080, maxFps: 60, maxBitrate: 8_000_000 },
  "1440p": { width: 2560, height: 1440, maxFps: 60, maxBitrate: 18_000_000 },
  "source": { width: 3840, height: 2160, maxFps: 60, maxBitrate: 40_000_000 },
};

/** Build simulcast layers for screen share based on selected resolution. */
function getScreenShareSimulcastLayers(resolution: StreamResolution): VideoPreset[] {
  // 720p: single layer, no simulcast needed
  if (resolution === "720p") return [];

  const layers: VideoPreset[] = [];
  // Always include a 720p fallback layer
  layers.push(new VideoPreset(1280, 720, 2_500_000, 30));

  if (resolution === "1440p" || resolution === "source") {
    // Include 1080p mid layer
    layers.push(new VideoPreset(1920, 1080, 8_000_000, 60));
  }

  // The top layer is handled by the primary encoding, not in simulcast layers
  return layers;
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
        // Force highest simulcast layer for screen shares — bypass adaptive downscaling
        (pub as RemoteTrackPublication).setVideoQuality(VideoQuality.HIGH);
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
        adaptiveStream: { pixelDensity: 'screen' },
        dynacast: true,
        reconnectPolicy: {
          nextRetryDelayInMs: (context: { retryCount: number; elapsedMs: number }) => {
            if (context.retryCount >= 7) return null; // give up after 7 retries
            const delay = Math.min(300 * Math.pow(2, context.retryCount), 10_000);
            return delay;
          },
        },
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

      room.on(RoomEvent.Reconnecting, () => {
        console.warn("[LiveKit] reconnecting…");
        setCallState("reconnecting");
      });

      room.on(RoomEvent.Reconnected, () => {
        console.log("[LiveKit] reconnected");
        setCallState("connected");
        syncParticipants();
        syncScreenShares();
        syncCameras();
      });

      room.on(RoomEvent.SignalReconnecting, () => {
        console.warn("[LiveKit] signal layer reconnecting…");
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
      resolution?: StreamResolution;
      fps?: 30 | 60;
      sourceId?: string;
    }) => {
      const room = roomRef.current;
      if (!room) return;

      const res = opts?.resolution ?? "1080p";
      const preset = SCREEN_SHARE_PRESETS[res];
      const maxFramerate = Math.min(opts?.fps ?? 30, preset.maxFps);

      try {
        // ── 1. Manual track acquisition with strict FPS constraints ──────
        let stream: MediaStream;

        if (opts?.sourceId) {
          // Electron: use desktopCapturer sourceId with mandatory constraints
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: opts.sourceId,
                minWidth: preset.width,
                maxWidth: preset.width,
                minHeight: preset.height,
                maxHeight: preset.height,
                minFrameRate: maxFramerate,
                maxFrameRate: maxFramerate,
              },
            } as any,
          });
        } else {
          // Browser: use getDisplayMedia with strict min/ideal/max FPS
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              width: { ideal: preset.width },
              height: { ideal: preset.height },
              frameRate: { min: maxFramerate, ideal: maxFramerate, max: maxFramerate },
            },
            audio: false,
          });
        }

        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack) {
          console.error("[LiveKit] no video track acquired for screen share");
          return;
        }

        // ── 2. Set contentHint to "motion" for high-FPS priority ─────────
        videoTrack.contentHint = "motion";

        // ── 3. Build simulcast layers ────────────────────────────────────
        const simulcastLayers = getScreenShareSimulcastLayers(res);
        const useSimulcast = simulcastLayers.length > 0;

        // ── 4. Publish with H264 (HW-accelerated) + degradationPreference
        await room.localParticipant.publishTrack(videoTrack, {
          source: Track.Source.ScreenShare,
          videoCodec: "h264",
          backupCodec: { codec: "vp8" },
          degradationPreference: "balanced",
          simulcast: useSimulcast,
          ...(useSimulcast ? { videoSimulcastLayers: simulcastLayers } : {}),
          videoEncoding: {
            maxBitrate: preset.maxBitrate,
            maxFramerate,
            priority: "high",
          },
        } as TrackPublishOptions);

        setIsScreenSharing(true);

        // Listen for the track ending (user clicks browser "Stop sharing")
        videoTrack.addEventListener("ended", () => {
          const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
          if (pub?.track) {
            room.localParticipant.unpublishTrack(pub.track);
          }
          setIsScreenSharing(false);
        });
      } catch (err) {
        console.error("[LiveKit] screen share failed:", err);
      }
    },
    [metadata]
  );

  const stopScreenShare = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
    if (pub?.track) {
      pub.track.mediaStreamTrack.stop();
      await room.localParticipant.unpublishTrack(pub.track);
    }
    setIsScreenSharing(false);
  }, []);

  // ── Camera ────────────────────────────────────────────────────────────────

  const startCamera = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setCameraEnabled(true, {
      resolution: VideoPresets.h720.resolution,
      facingMode: "user",
    }, {
      simulcast: true,
      videoSimulcastLayers: [
        new VideoPreset(640, 360, 400_000, 30),
        new VideoPreset(1280, 720, 1_500_000, 30),
      ],
    } as TrackPublishOptions);
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
