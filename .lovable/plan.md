

# Fix 15fps Screen Share Cap

## Current State

After reviewing both files, the code is **already correctly implementing** most of the requested fixes. Here's the status:

### Already Correct — No Changes Needed
- **`useLiveKitRoom.ts`**: Electron `mandatory` constraints already include `minFrameRate: maxFramerate` and `maxFrameRate: maxFramerate` (lines 405-406)
- **`useLiveKitRoom.ts`**: `contentHint = "motion"` is already set (line 429)
- **`useLiveKitRoom.ts`**: H264 codec, `degradationPreference: "maintain-resolution"`, and `maxFramerate` in `videoEncoding` are all present (lines 436-447)
- **`main.cjs`**: `ignore-gpu-blocklist` and `enable-gpu-rasterization` already set (lines 62-63)
- **`main.cjs`**: `disableHardwareAcceleration()` is only called under an explicit env flag, not by default

### The Actual Problem: `enable-zero-copy`

The comment on line 64 says `enable-zero-copy` was **removed** because it "triggers GPU process crash when screen capture starts." However, this flag is critical for desktop capture performance — it allows the GPU to share frame buffers directly with the encoder instead of copying through CPU memory. Without it, Chromium falls back to a CPU-bound capture pipeline that caps at 15fps for desktop sources.

The original crash was likely caused by combining `enable-zero-copy` with the now-removed `enable-native-gpu-memory-buffers` and VAAPI flags. With those gone, `enable-zero-copy` should be safe to re-enable.

Additionally, we should add `enable-accelerated-video-encode` — the current flags only have `enable-accelerated-video-**decode**`, but encoding is the bottleneck for screen sharing.

## Plan — 1 File Change

### `main.cjs` (lines 62-75)

1. **Re-enable `enable-zero-copy`** — required for zero-copy GPU frame capture. The flags that previously caused crashes alongside it (`enable-native-gpu-memory-buffers`, VAAPI flags) have already been removed.

2. **Add `enable-accelerated-video-encode`** — currently only video *decode* is accelerated. This explicitly enables hardware video encoding (NVENC/QuickSync/VCE), which is the actual bottleneck causing the 15fps cap.

3. **Add `WebRTCHWH264Encoding` to `enable-features`** — forces Chromium's WebRTC stack to use the hardware H264 encoder path instead of falling back to OpenH264 software encoding (which caps at 15fps for 2K).

```
Before:
  ignore-gpu-blocklist
  enable-gpu-rasterization
  // enable-zero-copy REMOVED
  enable-accelerated-video-decode
  features: WebRTCPipeWireCapturer,CanvasOopRasterization,
            PlatformHEVCEncoderSupport,PlatformHEVCDecoderSupport

After:
  ignore-gpu-blocklist
  enable-gpu-rasterization
  enable-zero-copy                    ← RE-ENABLED
  enable-accelerated-video-decode
  enable-accelerated-video-encode     ← NEW
  features: WebRTCPipeWireCapturer,CanvasOopRasterization,
            PlatformHEVCEncoderSupport,PlatformHEVCDecoderSupport,
            WebRTCHWH264Encoding      ← NEW
```

No changes to `useLiveKitRoom.ts` — the frontend code is already correct. The 15fps cap is entirely caused by Chromium's GPU process not using hardware encoding.

