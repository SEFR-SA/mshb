# Screen Sharing Golden State — Restoration Reference

**Last verified working:** 2026-03-18
**Status:** Smooth, stable, forced resolution + FPS delivery

This file is a copy-paste restoration guide. If screen sharing breaks after a code change, compare the current code against the sections below and restore what was changed.

---

## Quick Sanity Check

If screen sharing is broken, check these three things first (most → least likely cause):

1. **`degradationPreference`** in `publishTrack` — must be `"disabled"`, NOT `"maintain-framerate"` or `"maintain-resolution"`
2. **`screenShareRelockRef` interval** — must be set up after `publishTrack`, clearing in both `ended` handler and `stopScreenShare`
3. **`simulcast: false`** in `publishTrack` — if simulcast was re-enabled, quality layers will cause fallback

---

## File 1: `src/hooks/useLiveKitRoom.ts`

### Section A — Module-level constants (lines 52–69)

```typescript
interface ScreenSharePreset {
  width: number;
  height: number;
  maxFps: number;
  maxBitrate: number; // bps
}

const SCREEN_SHARE_PRESETS: Record<StreamResolution, ScreenSharePreset> = {
  "720p":   { width: 1280, height:  720, maxFps: 60, maxBitrate:  2_500_000 },
  "1080p":  { width: 1920, height: 1080, maxFps: 60, maxBitrate: 15_000_000 },
  "1440p":  { width: 2560, height: 1440, maxFps: 60, maxBitrate: 18_000_000 },
  "source": { width: 3840, height: 2160, maxFps: 60, maxBitrate: 25_000_000 },
};

// Simulcast for screen shares is intentionally DISABLED.
// In small-group gaming calls, a single high-quality stream is better than
// simulcast layers that create permanent quality ceilings (720p@30fps fallback).
// Camera feeds still use simulcast — see startCamera().
```

**CRITICAL:** Do NOT change `maxFps` from 60 — all resolutions support 60fps. Do NOT lower bitrates below these values.

---

### Section B — Refs at hook initialization (line 104–105)

```typescript
const durationRef = useRef<ReturnType<typeof setInterval>>();
const screenShareRelockRef = useRef<ReturnType<typeof setInterval> | null>(null);
```

**CRITICAL:** `screenShareRelockRef` must exist. Without it, the re-lock interval cannot be stored or cleared.

---

### Section C — Room constructor (lines 180–193)

```typescript
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
```

**CRITICAL:** `adaptiveStream: false` must stay. Changing to `true` or `{ pixelDensity: 'screen' }` causes the SFU to downgrade quality based on the `<video>` element's CSS size, which is usually 180–360px → subscriber gets lowest quality layer.

---

### Section D — Complete `startScreenShare` function

```typescript
const startScreenShare = useCallback(
  async (opts?: {
    resolution?: StreamResolution;
    fps?: 30 | 60;
    sourceId?: string;
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
              minFrameRate: maxFramerate, // Force Chromium out of its 15fps default
              maxFrameRate: maxFramerate, // Upper bound — prevents overshooting
            },
            // Disable Chromium's webcam post-processing pipeline.
            optional: [
              { googNoiseReduction: false },
              { googHighpassFilter: false },
            ],
          } as any,
        });
      } else {
        // Browser / PWA path: use getDisplayMedia.
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
      // "motion" = prioritise framerate (games/video), "detail" = sharpness (apps/text).
      // Must be set here, not after publishTrack — LiveKit reads contentHint at publish time.
      videoTrack.contentHint = opts?.contentType ?? "motion";

      // ── 3. Publish with H264 — single stream, no simulcast ──
      // H264 has near-universal hardware encoder support (NVENC GTX 600+,
      // QuickSync Intel 4th gen+, VCE AMD GCN+).
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
      } as TrackPublishOptions);

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
```

---

### Section E — `stopScreenShare` function

```typescript
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
```

**CRITICAL:** The `clearInterval` block must be first. If you add logic above it that returns early, the interval will leak.

---

## File 2: `main.cjs` — Electron Flags

### Section A — GPU + WebRTC flags (inside the `else` block, runs unless `MSHB_DISABLE_GPU=1`)

```javascript
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
// enable-zero-copy intentionally REMOVED — caused GPU memory stalls
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-accelerated-video-encode');
app.commandLine.appendSwitch('webrtc-max-cpu-consumption-percentage', '100');
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('enable-features',
  'WebRTCPipeWireCapturer,CanvasOopRasterization,' +
  'PlatformHEVCEncoderSupport,PlatformHEVCDecoderSupport,' +
  'WebRTCHWH264Encoding,' +
  'WebRTCHWVP9Encoding,' +
  'WebRTCHWAV1Encoding'
);
// enable-gpu-memory-buffer-video-frames intentionally REMOVED — caused frame timing jitter
app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay');
```

**CRITICAL — DO NOT ADD BACK:**
- `enable-zero-copy` → GPU memory stalls
- `enable-gpu-memory-buffer-video-frames` → frame timing jitter / visible stutter

### Section B — Permission handlers (inside `app.whenReady().then(...)`)

```javascript
session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
  callback(['media', 'display-capture', 'mediaKeySystem', 'notifications'].includes(permission));
});

// REQUIRED in Electron 20+: without this, Notification.permission stays "default"
session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
  return ['media', 'display-capture', 'mediaKeySystem', 'notifications'].includes(permission);
});
```

### Section C — App User Model ID (Windows notification center)

```javascript
// Must appear before any window is created
if (process.platform === 'win32') {
  app.setAppUserModelId('com.mshb.app');
}
```

---

## File 3: `src/components/GoLiveModal.tsx`

### Critical interfaces and tier-gate functions

```typescript
export type StreamResolution = "720p" | "1080p" | "1440p" | "source";

export interface GoLiveSettings {
  resolution: StreamResolution;
  fps: 30 | 60;
  surface: "monitor" | "window";
  sourceId?: string;
  contentType: "motion" | "detail";
}

function isResolutionAllowed(res, isPro, boostLevel): boolean { ... }

function isFpsAllowed(resolution, isPro, boostLevel): boolean {
  if (resolution === "720p") return true; // 720p@60fps free for all
  if (isPro) return true;
  return getBoostPerks(boostLevel).maxScreenShareFps >= 60;
}
```

**CRITICAL:** `isFpsAllowed` must accept `resolution` as first parameter. If the signature is reverted to `isFpsAllowed(isPro, boostLevel)`, non-Pro users will lose 720p@60fps access.

---

## Settings That Must NEVER Be Changed

| Setting | Location | Must Stay | What breaks if changed |
|---|---|---|---|
| `degradationPreference` | useLiveKitRoom.ts publishTrack | `"disabled"` | GCC cold-start drops 1440p to 240p in 3 seconds |
| `simulcast` | useLiveKitRoom.ts publishTrack | `false` | Quality fallback layers created; SFU snaps to lowest |
| `adaptiveStream` | useLiveKitRoom.ts Room constructor | `false` | SFU downgrades to match small CSS element size |
| `screenShareRelockRef` interval | useLiveKitRoom.ts after publishTrack | every 3000ms | GCC overrides maxFramerate after ~5s → 15fps cap returns |
| `scaleResolutionDownBy` | setParameters lock | `1.0` | Encoder scales resolution down |
| `minFrameRate` in mandatory | capture constraints | equals maxFramerate | Chromium defaults to 15fps capture |
| `enable-gpu-memory-buffer-video-frames` | main.cjs | ABSENT | Stutter from frame timing jitter |

---

## How to Restore If Something Broke

### Step 1: Check Publisher DevTools

Open Electron DevTools (Ctrl+Shift+I or F12) and start a screen share. Look for:
```
[LiveKit] Screen capture actual settings: { width: X, height: X, frameRate: X }
[LiveKit] Screen share encoding locked: { maxBitrate: X, maxFramerate: X }
```

If the second line is MISSING, the `lockEncodingParams` block was removed or the `publishTrack` call throws before reaching it.

If `frameRate` in the first line shows 15 but you selected 60, the `minFrameRate`/`maxFrameRate` mandatory constraints were changed.

### Step 2: Check Subscriber

```javascript
document.querySelector('video').videoWidth   // check resolution
document.querySelector('video').videoHeight
```

If resolution is 240p/360p, `degradationPreference` was changed from `"disabled"`.
If resolution is correct but FPS is 15, the re-lock interval is missing.

### Step 3: Restore From This File

Copy the exact code from the sections above into the corresponding locations in `useLiveKitRoom.ts` and `main.cjs`. The code here is the exact working state.
