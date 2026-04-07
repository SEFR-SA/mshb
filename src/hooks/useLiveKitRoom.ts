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
import { calculateMaxAudioBitrate } from "@/config/boostPerks";
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
  "720p":  { width: 1280, height: 720,  maxFps: 60, maxBitrate: 2_500_000 },
  "1080p": { width: 1920, height: 1080, maxFps: 60, maxBitrate: 15_000_000 },
  "1440p": { width: 2560, height: 1440, maxFps: 60, maxBitrate: 18_000_000 },
  "source": { width: 3840, height: 2160, maxFps: 60, maxBitrate: 25_000_000 },
};

// Simulcast for screen shares is intentionally DISABLED.
// In small-group gaming calls, a single high-quality stream is better than
// simulcast layers that create permanent quality ceilings (720p@30fps fallback).
// Camera feeds still use simulcast — see startCamera().

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
  const [canPlayAudio, setCanPlayAudio] = useState(false);

  // Screen share state
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<
    { identity: string; name: string; stream: MediaStream; streamingApp?: string; streamStartedAt?: string }[]
  >([]);

  // Camera state
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [remoteCameraStreams, setRemoteCameraStreams] = useState<
    { identity: string; stream: MediaStream }[]
  >([]);

  const durationRef = useRef<ReturnType<typeof setInterval>>();
  const screenShareRelockRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Remote audio element manager ──────────────────────────────────────────
  const audioContainerRef = useRef<HTMLDivElement | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  const getAudioContainer = useCallback(() => {
    if (!audioContainerRef.current) {
      const div = document.createElement("div");
      div.id = "livekit-audio-container";
      div.style.display = "none";
      document.body.appendChild(div);
      audioContainerRef.current = div;
    }
    return audioContainerRef.current;
  }, []);

  const attachRemoteAudio = useCallback((track: any, trackSid: string) => {
    if (audioElementsRef.current.has(trackSid)) return;
    const container = getAudioContainer();
    const audioEl = document.createElement("audio");
    audioEl.autoplay = true;
    audioEl.setAttribute("playsInline", "true");
    track.attach(audioEl);
    container.appendChild(audioEl);
    audioElementsRef.current.set(trackSid, audioEl);
  }, [getAudioContainer]);

  const detachRemoteAudio = useCallback((track: any, trackSid: string) => {
    const audioEl = audioElementsRef.current.get(trackSid);
    if (audioEl) {
      track.detach(audioEl);
      audioEl.remove();
      audioElementsRef.current.delete(trackSid);
    }
  }, []);

  const cleanupAllAudio = useCallback(() => {
    audioElementsRef.current.forEach((el) => el.remove());
    audioElementsRef.current.clear();
    if (audioContainerRef.current) {
      audioContainerRef.current.remove();
      audioContainerRef.current = null;
    }
  }, []);

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
    const streams: { identity: string; name: string; stream: MediaStream; streamingApp?: string; streamStartedAt?: string }[] = [];
    room.remoteParticipants.forEach((p) => {
      const pub = p.getTrackPublication(Track.Source.ScreenShare);
      if (pub?.track?.mediaStream) {
        streams.push({
          identity: p.identity,
          name: p.name ?? p.identity,
          stream: pub.track.mediaStream,
          streamingApp: p.attributes?.streamingApp || undefined,
          streamStartedAt: p.attributes?.streamStartedAt || undefined,
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
        // adaptiveStream DISABLED — screen shares must receive full resolution.
        // With adaptive enabled, LiveKit auto-downgrades based on <video> CSS size
        // (e.g., 360px tile → SFU sends 720p@30fps fallback instead of 1440p@60fps).
        // Camera feeds don't need adaptive either in small-group calls (≤8 users).
        adaptiveStream: false,
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

      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio && participant instanceof RemoteParticipant) {
          const sid = publication.trackSid ?? `${participant.identity}-audio`;
          attachRemoteAudio(track, sid);
        }
        syncParticipants();
        syncScreenShares();
        syncCameras();
      });

      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        if (track.kind === Track.Kind.Audio) {
          const sid = publication.trackSid ?? `${(participant as any)?.identity}-audio`;
          detachRemoteAudio(track, sid);
        }
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

      room.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        setCanPlayAudio(room.canPlaybackAudio);
      });

      // Connect
      await room.connect(wsUrl, token);

      // Proactively start audio routing.
      // In Electron (autoplay-policy: no-user-gesture-required) this succeeds immediately.
      // In browsers it may silently fail — VoiceConnectionBar shows a toast fallback.
      try { await room.startAudio(); } catch {}
      setCanPlayAudio(room.canPlaybackAudio);

      // Attach audio tracks from participants already in the room when we join.
      // TrackSubscribed only fires for tracks arriving after connect.
      room.remoteParticipants.forEach((participant) => {
        participant.audioTrackPublications.forEach((pub) => {
          if (pub.track) {
            const sid = pub.trackSid ?? `${participant.identity}-audio`;
            attachRemoteAudio(pub.track, sid);
          }
        });
      });

      // Publish microphone (respecting initial mute) with tier + boost-level audio bitrate
      const localMeta = room.localParticipant.metadata;
      let audioBitrate = 96_000;
      if (localMeta) {
        try {
          const m = JSON.parse(localMeta);
          audioBitrate = calculateMaxAudioBitrate(m.isPro ?? false, m.boostLevel ?? 0);
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
    cleanupAllAudio();
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
  }, [cleanupAllAudio]);

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

  const startAudio = useCallback(async () => {
    const room = roomRef.current;
    if (!room) return;
    await room.startAudio();
    setCanPlayAudio(room.canPlaybackAudio);
  }, []);

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
      /** "motion" = FPS priority (games/video), "detail" = sharpness priority (apps/browsers) */
      contentType?: "motion" | "detail";
    }) => {
      const room = roomRef.current;
      if (!room) return;

      const res = opts?.resolution ?? "1080p";
      const preset = SCREEN_SHARE_PRESETS[res];
      const maxFramerate = Math.min(opts?.fps ?? 30, preset.maxFps);
      // 720p@60fps needs more headroom than 720p@30fps
      const maxBitrate = (res === "720p" && maxFramerate === 60) ? 4_000_000 : preset.maxBitrate;

      try {
        // ── 1. Manual track acquisition with strict FPS constraints ──────
        let stream: MediaStream;

        if (opts?.sourceId) {
          // Electron: use desktopCapturer sourceId with mandatory constraints.
          // For "source" mode, omit dimension constraints so the OS captures
          // at the monitor's true native resolution (not forced 3840×2160).
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              mandatory: {
                chromeMediaSource: "desktop",
                chromeMediaSourceId: opts.sourceId,
                ...(res !== "source" && {
                  minWidth:  preset.width,
                  maxWidth:  preset.width,
                  minHeight: preset.height,
                  maxHeight: preset.height,
                }),
                minFrameRate: maxFramerate, // Force Chromium out of its 15fps default; compositor can always honour this
                maxFrameRate: maxFramerate, // Upper bound — prevents overshooting
              },
              // Disable Chromium's webcam post-processing pipeline.
              // getUserMedia treats all sources (including desktop) as camera input,
              // applying spatial denoising + high-pass filtering that causes visible
              // over-sharpening/edge-enhancement on screen content.
              optional: [
                { googNoiseReduction: false },
                { googHighpassFilter: false },
              ],
            } as any,
          });
        } else {
          // Browser: use getDisplayMedia. For "source" mode let OS pick native
          // dimensions. No min FPS — allows graceful drop under GPU load.
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: {
              ...(res !== "source" && {
                width:  { ideal: preset.width },
                height: { ideal: preset.height },
              }),
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

        // Log actual capture settings for diagnostics
        const settings = videoTrack.getSettings();
        console.log("[LiveKit] Screen capture actual settings:", {
          width: settings.width,
          height: settings.height,
          frameRate: settings.frameRate,
          requested: { resolution: res, fps: maxFramerate, bitrate: maxBitrate },
        });

        // ── 2. Set contentHint BEFORE handing to LiveKit ──
        // "motion" = prioritise framerate (games/video), "detail" = prioritise sharpness (apps/text).
        // Must be set here, not after publishTrack — LiveKit reads contentHint at publish time
        // and uses it to choose its internal encoder tuning.
        videoTrack.contentHint = opts?.contentType ?? "motion";

        // ── 3. Publish with H264 — single stream, no simulcast ──
        // H264 has near-universal hardware encoder support (NVENC GTX 600+,
        // QuickSync Intel 4th gen+, VCE AMD GCN+). VP9 rarely has HW encoders,
        // causing software fallback that starves frames and caps at ~15fps.
        // Simulcast disabled: single high-quality stream for gaming screen shares.
        await room.localParticipant.publishTrack(videoTrack, {
          source: Track.Source.ScreenShare,
          videoCodec: "h264",
          // "disabled" = encoder never reduces resolution or framerate in response to GCC
          // feedback. The user explicitly selected their quality tier — we honour it.
          degradationPreference: "disabled",
          simulcast: false,
          videoEncoding: {
            maxBitrate,
            maxFramerate,
            priority: "high",
          },
        } as unknown as TrackPublishOptions);

        // ── 4. Lock RTCRtpSender encoding parameters ─────────────────────────
        // LiveKit SDK v2.x does not apply maxFramerate to RTCRtpSender when
        // simulcast=false. Without this, Chromium defaults to 15fps for screen
        // share sources. GCC also overrides setParameters every ~5s via REMB/TWCC
        // feedback — re-locking every 3s prevents quality drift.
        const lockEncodingParams = async () => {
          const pub = room.localParticipant.getTrackPublication(Track.Source.ScreenShare);
          const sender = (pub?.track as any)?.sender as RTCRtpSender | undefined;
          if (!sender) return;
          const params = sender.getParameters();
          if (!params.encodings?.length) return;
          params.encodings[0].maxBitrate           = maxBitrate;
          params.encodings[0].maxFramerate         = maxFramerate;
          params.encodings[0].scaleResolutionDownBy = 1.0;
          params.encodings[0].priority             = "high";
          params.encodings[0].networkPriority      = "high";
          await sender.setParameters(params).catch((e) =>
            console.warn("[LiveKit] setParameters failed:", e)
          );
        };

        // Wait 200ms for LiveKit to finish setting up the RTCPeerConnection
        await new Promise<void>((r) => setTimeout(r, 200));
        await lockEncodingParams();

        if (screenShareRelockRef.current) clearInterval(screenShareRelockRef.current);
        screenShareRelockRef.current = setInterval(lockEncodingParams, 3000);

        console.log("[LiveKit] Screen share encoding locked:", { maxBitrate, maxFramerate });

        setIsScreenSharing(true);

        // Listen for the track ending (user clicks browser "Stop sharing")
        videoTrack.addEventListener("ended", () => {
          if (screenShareRelockRef.current) {
            clearInterval(screenShareRelockRef.current);
            screenShareRelockRef.current = null;
          }
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
    if (screenShareRelockRef.current) {
      clearInterval(screenShareRelockRef.current);
      screenShareRelockRef.current = null;
    }
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

  // ── Audio Bitrate (tier + boost-level aware) ──────────────────────────────

  const getAudioBitrate = useCallback(() => {
    return calculateMaxAudioBitrate(metadata?.isPro ?? false, metadata?.boostLevel ?? 0);
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

    // Audio playback
    canPlayAudio,
    startAudio,

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
