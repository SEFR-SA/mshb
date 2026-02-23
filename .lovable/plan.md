

## "Go Live" Screen Share Configuration Modal

### Overview

Replace the current instant-start screen sharing with a Discord-style configuration modal that lets users choose resolution, frame rate, and preview their source before going live. Add a "LIVE" badge on voice channel participants who are screen sharing.

### New Files

**`src/components/server/GoLiveModal.tsx`**
A dialog component styled like the Discord reference image:
- Title: "Share your screen"
- Two tabs: "Applications" and "Screens" (note: browser `getDisplayMedia()` does not allow pre-enumerating windows/screens, so the tabs will trigger the browser's native source picker and then show a single preview thumbnail of the selected source)
- Resolution toggle group: 720 | **1080** (default) | Source
- Frame Rate toggle group: **30** (default) | 60
- Footer: Cancel button + purple "Go Live" button
- When the user clicks a tab or the preview area, `getDisplayMedia()` is called with minimal constraints to let the user pick a source; a live preview thumbnail is shown
- "Go Live" applies the selected resolution/fps constraints and passes the stream back to the caller

**Design approach for source selection**: Since browser APIs don't allow enumerating windows before calling `getDisplayMedia()`, the modal will:
1. Show a "Click to select source" placeholder initially
2. When clicked, trigger `getDisplayMedia()` with basic constraints
3. Display the captured stream as a live preview thumbnail
4. User can then adjust resolution/FPS settings
5. Clicking "Go Live" applies the final constraints and starts sharing

### Modified Files

**`src/hooks/useWebRTC.ts`**
- Change `startScreenShare` to accept an options parameter: `{ resolution: '720p' | '1080p' | 'source', fps: 30 | 60, stream: MediaStream }`
- Instead of calling `getDisplayMedia()` internally, accept the pre-captured stream from the modal
- Map resolution to width/height constraints and apply them via `sender.setParameters()` with appropriate `maxBitrate`:
  - 720p: maxBitrate 4 Mbps
  - 1080p: maxBitrate 8 Mbps
  - Source: maxBitrate 8 Mbps
- Set `contentHint = "motion"` and `degradationPreference = "maintain-resolution"` for gaming optimization

**`src/components/server/VoiceConnectionBar.tsx`**
- Change `startScreenShare` to accept the same options parameter with the pre-captured stream
- Apply resolution-appropriate bitrate via `sender.setParameters()`
- Update the DB flag (`is_screen_sharing`) as before

**`src/components/server/ChannelSidebar.tsx`**
- Add a `GoLiveModal` trigger: clicking the screen share button opens the modal instead of directly starting screen share
- Manage modal open/close state
- Pass the modal's result (stream + settings) to the screen share start function
- Add a "LIVE" badge next to voice participant avatars: query `is_screen_sharing` from `voice_channel_participants` and render a small red/purple "LIVE" badge when true

**`src/pages/Chat.tsx`** and **`src/components/chat/VoiceCallUI.tsx`**
- Wire up the GoLiveModal for 1-to-1 call screen sharing as well
- The screen share button in the call UI opens the modal instead of directly calling `startScreenShare`

### Technical Details

#### GoLiveModal Component Structure

```tsx
// State
const [open, setOpen] = useState(false)
const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
const [resolution, setResolution] = useState<'720p' | '1080p' | 'source'>('1080p')
const [fps, setFps] = useState<30 | 60>(30)

// On source selection (click preview area)
const selectSource = async () => {
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { cursor: 'always' },
    audio: { echoCancellation: true }
  })
  setPreviewStream(stream)
}

// On "Go Live"
const handleGoLive = () => {
  onGoLive({ resolution, fps, stream: previewStream })
  setOpen(false)
}
```

#### Resolution to Constraints Mapping

```text
720p  -> width: 1280, height: 720,  maxBitrate: 4_000_000
1080p -> width: 1920, height: 1080, maxBitrate: 8_000_000
Source -> no width/height override, maxBitrate: 8_000_000
```

#### LIVE Badge in Voice Channel

The `VoiceParticipant` interface gets an `is_screen_sharing` field. The fetch query already hits `voice_channel_participants` -- just add `is_screen_sharing` to the select. Render:

```tsx
{p.is_screen_sharing && (
  <span className="text-[9px] font-bold bg-red-500 text-white px-1 rounded uppercase">
    LIVE
  </span>
)}
```

#### Sender Parameters for Gaming

```typescript
params.encodings[0].maxBitrate = bitrate;
(params.encodings[0] as any).maxFramerate = fps;
(params as any).degradationPreference = "maintain-resolution";
videoTrack.contentHint = "motion";
```

### Files Summary

| File | Action |
|------|--------|
| `src/components/server/GoLiveModal.tsx` | Create -- modal with source preview, resolution/fps toggles |
| `src/hooks/useWebRTC.ts` | Modify -- `startScreenShare` accepts stream + settings |
| `src/components/server/VoiceConnectionBar.tsx` | Modify -- `startScreenShare` accepts stream + settings |
| `src/components/server/ChannelSidebar.tsx` | Modify -- open GoLiveModal, add LIVE badge, fetch `is_screen_sharing` |
| `src/pages/Chat.tsx` | Modify -- wire GoLiveModal for 1-to-1 calls |
| `src/components/chat/VoiceCallUI.tsx` | Modify -- wire GoLiveModal for call UI |
| `src/contexts/VoiceChannelContext.tsx` | No changes needed |

