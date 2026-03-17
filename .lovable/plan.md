
## Goal
Stabilize screen share so the selected FPS is actually honored and stutter is reduced, without changing providers yet. The current code shows the approved fix was only partially applied.

## What I found
- `useLiveKitRoom.ts` still publishes screen share with `videoCodec: "vp9"` plus `backupCodec: { codec: "h264" }`.
- `main.cjs` still enables `enable-gpu-memory-buffer-video-frames`.
- `1080p` is still capped at `12_000_000` bitrate in `SCREEN_SHARE_PRESETS`.
- The build is failing because `videoTrack.applyConstraints({ resizeMode: "none" })` is not valid for `MediaTrackConstraints`.
- `ScreenShareViewer.tsx` no longer contains the old direct screen-share button, so that legacy bypass appears already removed.

## Implementation plan

### 1) Fix the build error first
In `src/hooks/useLiveKitRoom.ts`:
- Remove the invalid `resizeMode` constraint entirely.
- Replace it with a safe post-capture enforcement step:
  - `await videoTrack.applyConstraints({ frameRate: { min: maxFramerate, ideal: maxFramerate, max: maxFramerate } }).catch(() => {})`
- Keep `contentHint = "motion"` / `"detail"` before publish.

This unblocks the build and directly targets the 15fps fallback.

### 2) Finish the codec migration properly
In `src/hooks/useLiveKitRoom.ts`:
- Change screen-share publish from VP9 to H264:
  - `videoCodec: "h264"`
- Remove `backupCodec`.
- Keep `simulcast: false`.

Why: right now the code is still biased toward VP9, which commonly falls back to software encoding and causes dropped frames/stutter on desktop capture.

### 3) Raise bitrate ceilings for gaming motion
In `SCREEN_SHARE_PRESETS`:
- Increase `1080p` from `12_000_000` to `15_000_000`.
- Keep `720p@60` special case with extra headroom.
- Leave `1440p/source` high enough for now, then tune after verification.

Why: if motion content is under-provisioned, the encoder preserves compatibility by reducing smoothness first.

### 4) Remove the Electron flag most likely causing capture jitter
In `main.cjs`:
- Remove `app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames')`.
- Keep:
  - `enable-accelerated-video-encode`
  - `WebRTCHWH264Encoding`
  - other core GPU/WebRTC flags

Why: the current capture path is likely paying for unstable frame timing, which feels like stutter even when bitrate is available.

### 5) Verify the Go Live settings are actually flowing end-to-end
Trace and align:
```text
GoLiveModal
  -> VoiceConnectionBar / DM handlers
    -> useLiveKitCall
      -> useLiveKitRoom.startScreenShare
        -> getUserMedia/getDisplayMedia constraints
        -> LiveKit publishTrack
```
I’ll verify that:
- selected `fps` from `GoLiveModal` is passed unchanged,
- `sourceId` path uses strict Electron desktop constraints,
- `maxFramerate` is not being silently clamped elsewhere.

### 6) Add temporary diagnostics so this stops being guesswork
In the screen-share pipeline, add lightweight logs/overlay for:
- requested resolution/FPS,
- actual `videoTrack.getSettings()` width/height/frameRate,
- selected codec,
- applied bitrate ceiling.

This is important because “looks like 15fps” needs to become measurable. If the selected 60 is not reflected in `getSettings()`, the problem is capture-side; if capture is 60 but viewers still see 15, the problem is publish/encode/SFU-side.

## Expected result
After these changes:
- the build error is gone,
- the selected FPS should stop collapsing to the browser default path,
- hardware H264 encoding should reduce stutter significantly,
- the stream should behave more like a single high-quality gaming feed instead of a conservative conferencing stream.

## If performance is still not good enough
If this still does not get close to Discord-quality, the next step should be a deliberate screen-share redesign, not a provider switch:

### Phase 2 redesign
- Separate screen-share publishing strategy from camera strategy completely.
- Create a dedicated screen-share publisher module/hook with:
  - one capture path for Electron,
  - one publish profile for motion,
  - one publish profile for detail,
  - explicit stats collection.
- Add sender/receiver stats sampling from LiveKit/WebRTC:
  - actual outgoing FPS,
  - encode time,
  - packet loss,
  - retransmissions,
  - viewer-side decoded FPS.

### Why not switch to Agora yet
Agora will not automatically fix:
- bad capture constraints,
- invalid FPS enforcement,
- software codec fallback,
- Electron frame-timing issues.

Those are implementation-level problems. Switching providers before measuring this cleaned-up pipeline would likely just move the same bottleneck.

## Files to update
- `src/hooks/useLiveKitRoom.ts`
- `main.cjs`

## Success criteria
- User selects 60 FPS in Go Live and `getSettings().frameRate` reflects ~60 on capture.
- 1080p stream no longer feels capped at ~15 FPS.
- Stutter is materially reduced during game motion.
- No build errors.
