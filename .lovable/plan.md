

# LiveKit Quality & Simulcast Overhaul

## Overview
Four changes: updated bitrate/resolution tiers, simulcast encoding layers, boost-level video perks for servers, and VP9 codec preference.

## 1. Update `GoLiveSettings` Type & Resolution Options

**File: `src/components/GoLiveModal.tsx`**

- Change resolution type from `"720p" | "1080p" | "source"` to `"720p" | "1080p" | "1440p" | "source"`
- Add a **1440p (2K)** toggle button between 1080p and Source
- 1440p requires Pro OR server boost Level 2+
- Update validation logic:
  - **Free users (no boost context in DMs):** locked to 1080p/30fps max. 60fps blocked at all resolutions.
  - **Pro users:** all options unlocked (720p–4K, 30/60fps)
- The modal needs a new optional prop `boostLevel?: number` so server-context callers can pass the room's boost level to unlock tiers for free users
- Boost-aware unlock logic:
  - Level 0: 1080p/30fps max for free
  - Level 1: 1080p/60fps unlocked for free
  - Level 2: 1440p/60fps unlocked for free
  - Level 3: 4K/60fps unlocked for free
- FPS validation: Free users get 60fps only if boost >= 1 (server context) or if they're Pro

**Update `GoLiveSettings` interface** to include `"1440p"` in the resolution union.

## 2. Update `startScreenShare` in `useLiveKitRoom.ts`

**File: `src/hooks/useLiveKitRoom.ts`**

Update the `startScreenShare` function signature to accept `"720p" | "1080p" | "1440p" | "source"`.

**Resolution → dimensions + bitrate mapping:**
```
720p  → 1280×720,  maxFps=30,  bitrate=2,500,000
1080p → 1920×1080, maxFps=60,  bitrate=8,000,000
1440p → 2560×1440, maxFps=60,  bitrate=18,000,000
source→ 3840×2160, maxFps=60,  bitrate=40,000,000
```

**Enable simulcast** with fallback layers:
- For source (4K): layers at 720p (2.5Mbps), 1080p (8Mbps), 4K (40Mbps)
- For 1440p: layers at 720p (2.5Mbps), 1080p (8Mbps), 1440p (18Mbps)
- For 1080p: layers at 720p (2.5Mbps), 1080p (8Mbps)
- For 720p: single layer (no simulcast needed)

**Codec:** Change `videoCodec` from `"vp8"` to `"vp9"` with `backupCodec: { codec: "vp8" }`.

Note: LiveKit's `TrackPublishOptions` supports `simulcast: true` and `videoSimulcastLayers` for defining encoding presets. We'll use the `VideoPreset` class to define layers.

## 3. Update Camera Track with Simulcast

**File: `src/hooks/useLiveKitRoom.ts`**

Update `startCamera` to enable simulcast with 2 layers:
- Layer 1: 360p (~400kbps)
- Layer 2: 720p (~1.5Mbps)

Use `simulcast: true` in publish options and provide `videoSimulcastLayers`.

## 4. Update `boostPerks.ts` with Video Perks

**File: `src/config/boostPerks.ts`**

Add video-related fields to `BoostPerks`:
```typescript
maxScreenShareRes: "1080p" | "1440p" | "4k";
maxScreenShareFps: 30 | 60;
```

Values:
- Level 0: `"1080p"`, 30fps
- Level 1: `"1080p"`, 60fps  
- Level 2: `"1440p"`, 60fps
- Level 3: `"4k"`, 60fps

## 5. Wire Boost Level into GoLiveModal Callers

**Files: `VoiceConnectionBar.tsx`, `ChannelSidebar.tsx` (wherever GoLiveModal is opened for server voice)**

Pass `boostLevel` from `metadata` (already available from LiveKit participant metadata) into GoLiveModal so free users see the correct unlocked tiers.

**File: `VoiceCallUI.tsx` / `Chat.tsx` / `CallListener.tsx`** — DM calls don't have boost context, so `boostLevel` defaults to 0 (free users locked to 1080p/30fps in DMs).

## 6. Update `useLiveKitCall.ts` Resolution Type

**File: `src/hooks/useLiveKitCall.ts`**

Update the `startScreenShare` wrapper to accept `"1440p"` in the resolution union so it passes through correctly to `useLiveKitRoom`.

## Files Changed (Summary)

| File | Change |
|---|---|
| `src/config/boostPerks.ts` | Add `maxScreenShareRes` and `maxScreenShareFps` fields |
| `src/components/GoLiveModal.tsx` | Add 1440p option, accept `boostLevel` prop, update validation |
| `src/hooks/useLiveKitRoom.ts` | New bitrate table, simulcast layers, VP9 codec, camera simulcast |
| `src/hooks/useLiveKitCall.ts` | Update resolution type to include `"1440p"` |
| `src/components/chat/VoiceCallUI.tsx` | Pass `boostLevel` prop to GoLiveModal |
| `src/components/server/VoiceConnectionBar.tsx` | Pass boost level when dispatching screen share |

