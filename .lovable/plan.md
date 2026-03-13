
Implementation plan to stabilize FPS (undo zero-copy conflict + rebalance encoder load)

1) Baseline review findings (already verified)
- `main.cjs` currently enables: `enable-zero-copy`, `enable-accelerated-video-encode`, `WebRTCHWH264Encoding`.
- `useLiveKitRoom.ts` currently publishes screen share with:
  - strict Electron `minFrameRate/maxFrameRate`
  - `videoCodec: "h264"`
  - `degradationPreference: "maintain-resolution"`
  - `videoEncoding.maxFramerate = selected fps`
  - `contentHint = "motion"`
  - 1440p preset bitrate already `18_000_000` (good for 2K/60 target).

2) File change A — `main.cjs` (GPU flags)
- Remove only: `app.commandLine.appendSwitch('enable-zero-copy')`.
- Keep: `enable-accelerated-video-encode`, `ignore-gpu-blocklist`, `enable-gpu-rasterization`, and `WebRTCHWH264Encoding`.
- Keep existing `MSHB_DISABLE_GPU` diagnostic path unchanged.

3) File change B — `src/hooks/useLiveKitRoom.ts` (publisher behavior)
- In `startScreenShare` publish options:
  - change `degradationPreference` from `"maintain-resolution"` → `"balanced"`.
  - keep `videoCodec: "h264"`.
  - keep explicit `videoEncoding.maxFramerate = maxFramerate`.
- Add track priority in SDK-supported form:
  - set `videoEncoding.priority = "high"` (this is the valid field in current LiveKit client typings).
- Keep `videoTrack.contentHint = "motion"` before publish (with a safe capability guard if needed).

4) Bitrate ceiling verification (same file)
- Keep 1440p bitrate at `18 Mbps` and source at `40 Mbps` (already sufficient).
- Add a protective floor for 1440p/60 path if needed so this cannot regress below `18 Mbps` in future refactors.

5) Validation plan (post-change)
- E2E Electron test at 1440p/60 with game-like motion:
  - verify sender `outbound-rtp` fps rises above prior 7–12 range and stabilizes.
  - verify receiver `inbound-rtp` fps tracks near target under normal LAN/strong WAN.
  - confirm no new GPU-process instability after removing zero-copy.
- If approved, I will implement these changes in exactly 2 files: `main.cjs` and `src/hooks/useLiveKitRoom.ts`.
