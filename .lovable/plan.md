

## Screen Share: True "Source" Quality at 60fps

### Problem
The current screen share constraints hardcode `width: { ideal: 1920 }, height: { ideal: 1080 }`, which tells the browser to target 1080p. Users with 2K or 4K monitors are being downscaled to 1080p instead of sharing at their native resolution.

### Solution
Remove the explicit width/height constraints entirely and only request 60fps. This lets the browser capture at the monitor's native resolution ("Source" quality). Additionally, configure the WebRTC sender encoding to prevent the browser from downscaling under bandwidth pressure.

### Changes

**`src/components/server/VoiceConnectionBar.tsx`**

1. Update `getDisplayMedia` constraints -- remove width/height, keep only frameRate:
   ```text
   navigator.mediaDevices.getDisplayMedia({
     video: { frameRate: { ideal: 60 } },
     audio: false,
   })
   ```

2. After adding the screen share track to each peer connection, configure the RTP sender to prevent downscaling:
   - Set `degradationPreference` to `"maintain-resolution"` (drop framerate before resolution)
   - Set `maxBitrate` to 8 Mbps to allow high-fidelity streaming
   - Apply this in `startScreenShare` (for existing peers) and in `createPeerConnection` (for new peers joining while already sharing)

**`src/hooks/useWebRTC.ts`**

1. Same `getDisplayMedia` constraint change (remove width/height, keep frameRate: 60)

2. Same sender encoding configuration after `pc.addTrack` for the screen share track

### Technical Details

Helper function added to both files:
```text
async function configureHighQualitySender(sender: RTCRtpSender, maxBitrate: number) {
  try {
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    params.encodings[0].maxBitrate = maxBitrate;
    params.degradationPreference = "maintain-resolution";
    await sender.setParameters(params);
  } catch {}
}
```

Called with 8,000,000 (8 Mbps) for screen share senders wherever they are created.

### Files Modified
- `src/components/server/VoiceConnectionBar.tsx` -- source-quality constraints + sender encoding
- `src/hooks/useWebRTC.ts` -- source-quality constraints + sender encoding

