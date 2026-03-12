

# Screen Share Performance Fix — Custom Track Publishing with HW Acceleration

## Problem
Chromium's `getDisplayMedia` defaults to `contentHint: "detail"` (text/slides mode), which aggressively drops FPS to preserve resolution. Combined with VP9 software encoding at 2K+, this causes streams to lock at ~8fps despite sufficient bandwidth.

## Root Cause (3 factors)
1. **No `contentHint`** set on the track — Chromium defaults to "detail" mode which deprioritizes framerate
2. **VP9 software encoding** at 2K/60fps overwhelms the CPU — VP9 has poor hardware encoder support on most GPUs
3. **`setScreenShareEnabled()` helper** internally calls `getDisplayMedia` without strict `minFrameRate` constraints, and in Electron it may ignore `desktopCapturer` source IDs

## Solution — 4 Changes in `src/hooks/useLiveKitRoom.ts`

### 1. Manual Track Acquisition with Strict FPS Constraints

Replace `setScreenShareEnabled(true, captureOptions, publishOptions)` with manual track creation. This gives us full control over `getUserMedia` constraints.

**For Electron** (when `sourceId` is provided):
```typescript
const stream = await navigator.mediaDevices.getUserMedia({
  audio: false,
  video: {
    mandatory: {
      chromeMediaSource: "desktop",
      chromeMediaSourceId: sourceId,
      minWidth: preset.width,
      maxWidth: preset.width,
      minHeight: preset.height,
      maxHeight: preset.height,
      minFrameRate: maxFramerate,
      maxFrameRate: maxFramerate,
    },
  } as any,
});
```

**For browser** (no sourceId):
```typescript
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: {
    width: { ideal: preset.width },
    height: { ideal: preset.height },
    frameRate: { min: maxFramerate, ideal: maxFramerate, max: maxFramerate },
  },
  audio: false,
});
```

### 2. Set `contentHint = "motion"` on the Track

After acquiring the `MediaStreamTrack`, explicitly set:
```typescript
track.contentHint = "motion";
```
This tells Chromium's WebRTC encoder to prioritize framerate over sharpness — the same approach Discord uses for game streaming. Without this, Chromium treats screen shares as "detail" (text/slides) and aggressively drops FPS.

### 3. Codec: H264 Primary, VP8 Fallback (Hardware Acceleration)

Change from `vp9` to `h264` as the primary codec. H264 has near-universal hardware encoder support (NVENC, QuickSync, AMD VCE), which eliminates the CPU bottleneck at 2K/4K resolutions. VP8 as backup ensures compatibility with older clients.

```typescript
videoCodec: "h264",
backupCodec: { codec: "vp8" },
```

VP9 is superior compression but software-only on most desktop GPUs in Chromium's WebRTC stack, making it unsuitable for high-res/high-fps screen sharing.

### 4. Publish via `publishTrack()` with `degradationPreference`

Instead of `setScreenShareEnabled()`, use `room.localParticipant.publishTrack(track, options)` to publish the manually-acquired track with full control:

```typescript
await room.localParticipant.publishTrack(track, {
  source: Track.Source.ScreenShare,
  videoCodec: "h264",
  backupCodec: { codec: "vp8" },
  degradationPreference: "balanced",
  simulcast: useSimulcast,
  videoSimulcastLayers: simulcastLayers,
  videoEncoding: {
    maxBitrate: preset.maxBitrate,
    maxFramerate,
  },
});
```

Setting `degradationPreference: "balanced"` combined with the strict `minFrameRate` constraint ensures WebRTC won't unilaterally sacrifice framerate.

### 5. Update `stopScreenShare`

Since we're no longer using `setScreenShareEnabled`, stopping must manually unpublish the track and stop the underlying `MediaStreamTrack`:

```typescript
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
```

## Files Modified

| File | Change |
|---|---|
| `src/hooks/useLiveKitRoom.ts` | Rewrite `startScreenShare` to manually acquire track, set `contentHint`, publish with H264 + `degradationPreference`; update `stopScreenShare` to manually unpublish |

No other files need changes — `GoLiveModal`, `VoiceConnectionBar`, and `useLiveKitCall` all pass settings through to this function unchanged.

## Technical Summary

| Setting | Before | After |
|---|---|---|
| Track acquisition | `setScreenShareEnabled()` helper | Manual `getUserMedia`/`getDisplayMedia` |
| FPS constraint | `frameRate` only (no min) | `minFrameRate` + `maxFrameRate` (Electron) or `min/ideal/max` (browser) |
| `contentHint` | Not set (defaults to "detail") | Explicitly `"motion"` |
| Codec | VP9 (software-only on most GPUs) | H264 (hardware-accelerated) with VP8 backup |
| `degradationPreference` | Not set | `"balanced"` |
| Stop method | `setScreenShareEnabled(false)` | Manual unpublish + track.stop() |

