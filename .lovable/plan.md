

## Screen Share: Upgrade to 1080p 60fps

### Current State
Both screen share implementations (`VoiceConnectionBar.tsx` for server voice channels and `useWebRTC.ts` for 1-to-1 calls) use `{ video: true, audio: false }` with no resolution or framerate constraints. The browser defaults to roughly 720p at 15-30fps.

### Change
Update the `getDisplayMedia` constraints in both files to request 1080p at 60fps using `ideal` values (graceful fallback if hardware can't deliver).

### Files Modified

**`src/components/server/VoiceConnectionBar.tsx`** -- update `getDisplayMedia` call  
**`src/hooks/useWebRTC.ts`** -- update `getDisplayMedia` call

Both will change from:
```text
navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
```
To:
```text
navigator.mediaDevices.getDisplayMedia({
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 60 },
  },
  audio: false,
})
```

Using `ideal` ensures the browser targets 1080p/60fps but gracefully falls back on lower-end hardware without throwing errors.

