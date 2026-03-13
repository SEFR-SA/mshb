

# Fix Screen Share Downscaling to 360p/270p on Viewer Side

## Problem
Screen shares published at 2K/60fps are being downscaled to 360p/15fps on the viewer side. Three causes:

1. **`adaptiveStream: true`** tells the LiveKit SDK to automatically reduce the subscribed video quality based on the rendered `<video>` element's viewport size. Since `ScreenShareViewer` renders at `h-[360px]` (non-fullscreen), the SDK sees a ~360px tall container and requests the lowest simulcast layer.

2. **No `VideoQuality.HIGH` override** — `syncScreenShares` grabs the track's `mediaStream` but never forces the subscription quality. The SDK defaults to adaptive (low layer for small viewports).

3. **`degradationPreference: "balanced"`** on the publisher allows WebRTC to reduce both resolution and framerate under load. For gaming/text screen shares, this should be `"maintain-resolution"`.

## Changes

### File 1: `src/hooks/useLiveKitRoom.ts`

**A. Configure `adaptiveStream` to use screen pixel density**

Change `adaptiveStream: true` to `adaptiveStream: { pixelDensity: 'screen' }`. This tells the SDK to factor in the device's actual screen pixel density rather than CSS pixels when deciding quality, which significantly raises the quality threshold on high-DPI displays.

**B. Force `VideoQuality.HIGH` on screen share subscriptions**

In `syncScreenShares`, after finding a screen share publication, call `pub.setVideoQuality(VideoQuality.HIGH)` to override adaptive downscaling. This forces the SFU to send the highest available simulcast layer for screen shares regardless of viewport size.

```typescript
const pub = p.getTrackPublication(Track.Source.ScreenShare);
if (pub?.track?.mediaStream) {
  // Force highest quality for screen shares
  (pub as RemoteTrackPublication).setVideoQuality(VideoQuality.HIGH);
  streams.push({ ... });
}
```

Add `VideoQuality` to the livekit-client imports.

**C. Change `degradationPreference` from `"balanced"` to `"maintain-resolution"`**

In `startScreenShare`, line 437, change `degradationPreference: "balanced"` to `degradationPreference: "maintain-resolution"`. This prevents WebRTC from scaling down the resolution under CPU/bandwidth pressure — the `minFrameRate` constraint already handles FPS, so we prioritize keeping the full 2K/4K resolution intact.

### File 2: `src/components/server/ScreenShareViewer.tsx`

**D. Force video element dimensions for adaptive stream hinting**

The `<video>` element is rendered at `h-[360px]` in non-fullscreen mode. Even with `pixelDensity: 'screen'`, the SDK may still see a small element. Add `width` and `height` attributes matching the source resolution to hint the SDK that full-quality is needed:

No changes needed here if we're forcing `VideoQuality.HIGH` in the hook (Step B), which bypasses adaptive stream entirely for screen shares. The `VideoQuality.HIGH` override is the definitive fix.

## Summary

| Change | Location | Effect |
|---|---|---|
| `adaptiveStream: { pixelDensity: 'screen' }` | Room constructor | SDK uses physical pixels, raises quality threshold |
| `pub.setVideoQuality(VideoQuality.HIGH)` | `syncScreenShares` | Forces SFU to send highest simulcast layer for screen shares |
| `degradationPreference: "maintain-resolution"` | `startScreenShare` publish opts | Publisher never downscales resolution under pressure |

Three targeted changes in one file (`useLiveKitRoom.ts`). No other files affected.

