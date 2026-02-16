

## ✅ Optimize Screen Sharing: 1080p/60fps, System Audio, Full-Screen Toggle — COMPLETED

All changes implemented:
- `useWebRTC.ts`: 1080p/60fps constraints, `contentHint = 'motion'`, SDP bitrate patching (8Mbps max / 2Mbps min), system audio capture with toast fallback
- `ScreenShareViewer.tsx`: Full-screen toggle + hidden audio element for system audio playback
- `VoiceCallUI.tsx`: Full-screen toggle + hidden audio element on VideoElement
- `en.ts` / `ar.ts`: Added `fullScreen`, `exitFullScreen`, `audioNotShared` keys
