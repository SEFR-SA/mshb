# MSHB Screen Sharing — Technical Implementation Report

**Environment:** Electron 40.6.0 (Chromium 130) · LiveKit Client SDK 2.17.2 · React 18 + TypeScript
**Status:** Working — smooth, stable, forced resolution + FPS delivery
**Date:** 2026-03-18

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Problems Encountered & Root Causes](#problems-encountered--root-causes)
3. [Fixes Applied](#fixes-applied)
4. [Current Configuration (Golden State)](#current-configuration-golden-state)
5. [Tier Gating (Pro / Boost)](#tier-gating-pro--boost)
6. [How to Verify the Stream Is Working](#how-to-verify-the-stream-is-working)

---

## Architecture Overview

Screen sharing in MSHB flows through five layers in order:

```
[1] User picks settings in GoLiveModal
         ↓
[2] Electron desktopCapturer acquires the MediaStream
    (getUserMedia with chromeMediaSource mandatory constraints)
         ↓
[3] LiveKit SDK publishes the track to the SFU
    (publishTrack with H264, simulcast:false, degradationPreference:disabled)
         ↓
[4] RTCRtpSender.setParameters() locks bitrate + framerate directly
    (re-applied every 3 seconds to prevent GCC from overriding)
         ↓
[5] Subscriber receives the stream through LiveKit SFU
    (single stream, no layer switching, no adaptive downgrade)
```

### Key Files

| File | Role |
|---|---|
| `src/components/GoLiveModal.tsx` | UI for selecting resolution, FPS, content type, and source |
| `src/hooks/useLiveKitCall.ts` | Thin wrapper that forwards settings to the LiveKit hook |
| `src/hooks/useLiveKitRoom.ts` | All capture, publish, and encoding logic (the core file) |
| `src/components/server/VoiceConnectionBar.tsx` | Receives GoLive CustomEvent and calls `lk.startScreenShare()` |
| `main.cjs` | Electron main process — GPU flags, permission handlers, IPC |

---

## Problems Encountered & Root Causes

### Problem 1: Persistent 15fps cap (regardless of selected FPS)

**Symptom:** User selects 60fps, subscriber receives 15fps. Resolution holds correctly but FPS is capped.

**Root cause A — Chromium's desktopCapturer default:**
Chromium defaults to 15fps for all screen/desktop capture sources. Setting only `maxFrameRate: 60` in the mandatory constraint block tells Chromium "do not exceed 60fps" but does NOT lift the 15fps floor. Without `minFrameRate`, Chromium reads "no floor" and camps at 15fps.

**Root cause B — LiveKit SDK gap:**
LiveKit SDK v2.17.2 does not call `RTCRtpSender.setParameters()` with `maxFramerate` when `simulcast: false`. When the sender's encoding object has no explicit `maxFramerate` set, the Chromium WebRTC encoder defaults to 15fps for screen content. This is a gap in the SDK, not a bug — the SDK assumes simulcast will manage frame rates via layer configurations.

**How it was discovered:**
A previous attempt added `applyConstraints({ frameRate: { min: 60 } })` on the captured track after acquisition. This always failed silently (`.catch(() => {})`) because `applyConstraints` is not supported for `getUserMedia` tracks with `chromeMediaSource: "desktop"`. The track constraints are fixed at capture time via mandatory constraints.

---

### Problem 2: Resolution fallback — 1440p collapsing to 240p within seconds

**Symptom:** User selects 1440p, subscriber receives 240p/360p/480p immediately at call start. Quality slowly improves over 20-30 seconds.

**Root cause — GCC cold-start + `degradationPreference: "maintain-framerate"`:**

WebRTC's Google Congestion Control (GCC) starts every new connection at an extremely conservative bandwidth estimate (~200kbps). GCC probes and ramps up over time. This is by design — WebRTC cannot know the network capacity until it measures it.

With `degradationPreference: "maintain-framerate"` set on the publisher:
- The encoder receives GCC feedback: "estimated bandwidth = 200kbps"
- The encoder logic: "I must maintain the requested framerate (60fps). 200kbps ÷ 60fps = ~3kbps per frame. I must reduce resolution to achieve this."
- Resolution cascade: 1440p → 720p → 480p → 360p → 240p in under 3 seconds

Once GCC eventually ramps to the full available bandwidth (20-30 seconds), the encoder recovers. But the subscriber spent that entire time at 240p.

**Why this got worse after switching from VP9 to H264:**
The previous VP9 implementation used `scalabilityMode: "L1T3"` (temporal SVC), which locked the spatial resolution. When L1T3 was removed (because it caused framerate to snap to 15fps — the T0 temporal base layer), H264 without SVC responded directly to GCC's congestion signals by reducing resolution, which is the standard WebRTC encoder behavior.

---

### Problem 3: Stuttering at 1080p and above

**Symptom:** Visible frame drops and quality oscillation during streaming, especially in game content.

**Root cause — GCC oscillation:**
GCC runs a continuous bandwidth estimation loop. On a 300Mbps wired connection the estimation eventually reaches the full bitrate, but game content (high motion, scene changes) causes GCC to interpret encoder output size increases as congestion events. This triggers a reduce→ramp→reduce cycle that causes the encoder to constantly change its bitrate target. The encoder chasing a moving target means some frames are dropped or compressed too aggressively → visible stutter.

---

### Problem 4: L1T3 temporal layers snapping to 15fps (fixed in earlier session)

**What L1T3 is:**
VP9 Scalable Video Coding with 1 spatial layer and 3 temporal layers:
- T0 = base layer, 15fps (always delivered, never dropped)
- T1 = 30fps
- T2 = 60fps (dropped first under any bandwidth pressure)

**Why it caused 15fps:**
The SFU's bandwidth estimator, under ANY congestion pressure (including GCC cold-start), drops temporal layers starting from the highest. Under normal startup conditions, GCC triggers a reduction from T2 → T0, meaning the subscriber received exactly 15fps — which is 60fps ÷ 4 = the T0 base layer rate. This was the original 15fps cap.

**Fix applied:** Removed `scalabilityMode: "L1T3"` from `videoEncoding`.

---

### Problem 5: SFU adaptive streaming downgrading quality (fixed in earlier session)

**What adaptiveStream does:**
LiveKit's `adaptiveStream` monitors the subscriber's `<video>` element CSS dimensions and tells the SFU to send only the simulcast layer that matches the visible size. A 360px-tall video element → SFU sends the lowest quality layer.

**Why this caused issues:**
The screen share viewer tiles in the UI were rendered at 180-360px height. LiveKit saw these small CSS dimensions and told the SFU to send the lowest quality simulcast layer, even when the publisher was sending a perfect 1440p stream.

**Fix applied:** `adaptiveStream: false` in the Room constructor.

---

### Problem 6: Simulcast fallback layers creating quality ceilings (fixed in earlier session)

**What simulcast does:**
Creates multiple concurrent encoder streams (e.g., 1440p primary + 1080p fallback + 720p fallback). The SFU selects which layer to forward to each subscriber based on their bandwidth.

**Why this was wrong for gaming screen shares:**
- Simulcast is designed for large meetings (20+ participants at different connection speeds)
- For 1-to-1 or small gaming sessions, all participants are on good connections
- The 720p@30fps fallback layer created a permanent low-quality ceiling that the SFU snapped to under any GCC pressure
- With adaptiveStream also active (both problems compounding), the subscriber reliably received the worst-quality layer

**Fix applied:** `simulcast: false` — single high-quality stream only.

---

## Fixes Applied

### Fix 1: Capture layer — force FPS via mandatory constraints

**File:** `src/hooks/useLiveKitRoom.ts`

```typescript
mandatory: {
  chromeMediaSource: "desktop",
  chromeMediaSourceId: opts.sourceId,
  minWidth:  preset.width,
  maxWidth:  preset.width,
  minHeight: preset.height,
  maxHeight: preset.height,
  minFrameRate: maxFramerate,  // Forces Chromium out of 15fps default
  maxFrameRate: maxFramerate,  // Upper bound — prevents overshooting
},
optional: [
  { googNoiseReduction: false },   // Disable webcam-style post-processing
  { googHighpassFilter: false },   // Disable frequency filtering on screen content
],
```

**Why `minFrameRate` is the key:**
Chromium's desktopCapturer maintains a frame scheduler. `maxFrameRate` caps the scheduler but the scheduler defaults to 15fps without a floor. `minFrameRate` sets the scheduler's floor, forcing it to deliver frames at the requested rate.

**Why `googNoiseReduction: false`:**
`getUserMedia` treats all sources — including desktop capture — as camera inputs. Chromium applies webcam post-processing (spatial denoising, high-pass filtering, edge enhancement) that causes over-sharpening and visual artifacts on screen content (game assets, UI, text). Disabling these via the legacy optional constraint block eliminates the artifact.

---

### Fix 2: Disable adaptiveStream

**File:** `src/hooks/useLiveKitRoom.ts` — Room constructor

```typescript
const room = new Room({
  adaptiveStream: false,  // Never let LiveKit downgrade quality based on CSS element size
  dynacast: true,
  reconnectPolicy: { ... },
});
```

---

### Fix 3: Disable simulcast for screen shares

**File:** `src/hooks/useLiveKitRoom.ts` — `publishTrack` call

```typescript
await room.localParticipant.publishTrack(videoTrack, {
  source: Track.Source.ScreenShare,
  videoCodec: "h264",
  degradationPreference: "disabled",
  simulcast: false,       // Single high-quality stream; no fallback layers
  videoEncoding: {
    maxBitrate,
    maxFramerate,
    priority: "high",
  },
});
```

---

### Fix 4: `degradationPreference: "disabled"` — prevent GCC from reducing resolution

**File:** `src/hooks/useLiveKitRoom.ts`

```typescript
degradationPreference: "disabled",
```

This is the most important encoder setting. It tells the WebRTC encoder: "never change resolution or framerate in response to congestion feedback. Maintain exactly what was requested." The encoder will still adjust bitrate efficiency (compression quality) but will not touch the physical resolution or FPS.

Without this, GCC cold-start at ~200kbps would force the encoder to drop 1440p to 240p within 3 seconds of every call start.

---

### Fix 5: RTCRtpSender lock — force maxFramerate directly on the sender

**File:** `src/hooks/useLiveKitRoom.ts` — after `publishTrack`

```typescript
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

await new Promise<void>((r) => setTimeout(r, 200));
await lockEncodingParams();

screenShareRelockRef.current = setInterval(lockEncodingParams, 3000);
```

**Why RTCRtpSender.setParameters() is needed:**
LiveKit SDK v2.17.2 does not write `maxFramerate` to the `RTCRtpSender` encoding object when `simulcast: false`. The WebRTC encoder reads from this object to determine its operating FPS. Without an explicit value, it defaults to 15fps for screen sources.

`setParameters()` bypasses LiveKit entirely and directly writes to the Chromium WebRTC encoder's encoding configuration.

**Why the 3-second re-lock interval:**
GCC's TWCC/REMB feedback cycle runs approximately every 5 seconds and can overwrite the encoder's internal configuration, undoing what `setParameters()` set. Re-applying every 3 seconds stays ahead of GCC's override cycle.

The interval is stored in `screenShareRelockRef` and cleared in both the `ended` event handler and `stopScreenShare()` to prevent memory leaks.

---

### Fix 6: Codec — H264 hardware encoding

```typescript
videoCodec: "h264",
```

**Why H264 instead of VP9:**
H264 has near-universal hardware encoder support:
- NVIDIA: GTX 600+ via NVENC
- Intel: 4th gen+ via QuickSync
- AMD: GCN architecture+ via VCE

VP9 hardware encoding (NVENC VP9) requires Maxwell-class NVIDIA GPUs (GTX 900+) or newer. On systems where VP9 hardware encoding is unavailable, Chromium falls back to software encoding (libvpx), which is single-threaded and cannot sustain 60fps at 1440p — resulting in frame starvation and a return to the 15fps default.

The Electron flags `WebRTCHWH264Encoding`, `WebRTCHWVP9Encoding`, `WebRTCHWAV1Encoding` are all enabled, meaning hardware VP9 IS available on supported GPUs. However, using H264 as the primary codec guarantees hardware encoding on all gaming hardware back to 2012.

---

### Fix 7: Electron GPU flags (main.cjs)

```javascript
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-accelerated-video-encode');
app.commandLine.appendSwitch('webrtc-max-cpu-consumption-percentage', '100');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('enable-features',
  'WebRTCPipeWireCapturer,CanvasOopRasterization,' +
  'PlatformHEVCEncoderSupport,PlatformHEVCDecoderSupport,' +
  'WebRTCHWH264Encoding,WebRTCHWVP9Encoding,WebRTCHWAV1Encoding'
);
app.commandLine.appendSwitch('enable-hardware-overlays', 'single-fullscreen,single-on-top,underlay');
```

**Notably absent — `enable-gpu-memory-buffer-video-frames`:**
This flag was tested and caused frame timing jitter with Electron's desktopCapturer, producing visible stutter. It is intentionally excluded.

---

### Fix 8: Permission handlers (main.cjs)

```javascript
session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
  callback(['media', 'display-capture', 'mediaKeySystem', 'notifications'].includes(permission));
});

// Electron 20+ requires BOTH handlers. Without setPermissionCheckHandler,
// Notification.permission stays "default" forever.
session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
  return ['media', 'display-capture', 'mediaKeySystem', 'notifications'].includes(permission);
});
```

---

## Current Configuration (Golden State)

### Bitrate Ladder

| Resolution | Dimensions | Max Bitrate | Max FPS | Notes |
|---|---|---|---|---|
| 720p | 1280×720 | 2.5 Mbps | 60fps | 4 Mbps if @60fps |
| 1080p | 1920×1080 | 15 Mbps | 60fps | |
| 1440p | 2560×1440 | 18 Mbps | 60fps | |
| Source | Native res | 25 Mbps | 60fps | Dimensions unconstrained |

### Publisher Settings Summary

| Setting | Value | Why |
|---|---|---|
| `videoCodec` | `"h264"` | Universal hardware encoder support |
| `simulcast` | `false` | Single stream; no quality ceilings from layer switching |
| `degradationPreference` | `"disabled"` | Never let GCC reduce resolution or FPS |
| `adaptiveStream` (Room) | `false` | Never let LiveKit downgrade based on CSS element size |
| `dynacast` | `true` | OK — only pauses/resumes track, doesn't reduce quality |
| RTCRtpSender `maxFramerate` | locked to selection | Forces Chromium encoder FPS directly |
| RTCRtpSender `scaleResolutionDownBy` | `1.0` | Never scale resolution down |
| RTCRtpSender `networkPriority` | `"high"` | OS-level DSCP packet prioritisation |
| `contentHint` | `"motion"` (default) | FPS priority for games; `"detail"` for apps |
| Re-lock interval | every 3000ms | Prevents GCC from overriding setParameters |

---

## Tier Gating (Pro / Boost)

| User tier | 720p | 1080p | 1440p | Source | 60fps |
|---|---|---|---|---|---|
| Free (boost 0) | ✓ 30fps | ✓ 30fps | — | — | ✓ at 720p only |
| Boost Lv1 | ✓ | ✓ | — | — | Per boost perks |
| Boost Lv2 | ✓ | ✓ | ✓ | — | Per boost perks |
| Boost Lv3 | ✓ | ✓ | ✓ | ✓ | Per boost perks |
| Pro | ✓ | ✓ | ✓ | ✓ | ✓ all resolutions |

Note: 720p@60fps is available to all users regardless of tier.

**GoLiveModal tier check functions:**
```typescript
function isResolutionAllowed(res, isPro, boostLevel): boolean
function isFpsAllowed(resolution, isPro, boostLevel): boolean
```

---

## How to Verify the Stream Is Working

### Publisher side (DevTools console, press F12 in Electron with Ctrl+Shift+I)

Look for:
```
[LiveKit] Screen capture actual settings: { width: 2560, height: 1440, frameRate: 60 }
[LiveKit] Screen share encoding locked: { maxBitrate: 18000000, maxFramerate: 60 }
```

Every 3 seconds the lock silently re-applies. If you see `[LiveKit] setParameters failed:` warnings, the sender was unpublished before the lock ran — this is harmless.

### Subscriber side (DevTools console)

```javascript
// Check actual received resolution:
document.querySelector('video').videoWidth   // should be 2560 for 1440p
document.querySelector('video').videoHeight  // should be 1440

// Check received framerate (measure over 10 seconds):
const q = document.querySelector('video').getVideoPlaybackQuality();
// note q.totalVideoFrames at t=0
// wait 10 seconds
// new q.totalVideoFrames - old q.totalVideoFrames / 10 = actual fps received
```

Expected results for all 6 user-selectable tiers:

| Selection | Expected received |
|---|---|
| 720p@30fps | 1280×720 @ ~30fps |
| 720p@60fps | 1280×720 @ ~60fps |
| 1080p@30fps | 1920×1080 @ ~30fps |
| 1080p@60fps | 1920×1080 @ ~60fps |
| 1440p@30fps | 2560×1440 @ ~30fps |
| 1440p@60fps | 2560×1440 @ ~60fps |
