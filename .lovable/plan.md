

## Optimize Screen Sharing: 1080p/60fps, System Audio, Full-Screen Toggle

### Overview

Upgrade the screen sharing pipeline to support high-quality gaming streams with 1080p/60fps video, system audio capture, an 8 Mbps bitrate floor, and a full-screen viewing toggle. Add graceful fallback when the user skips audio in the browser picker.

---

### Changes

#### 1. `src/hooks/useWebRTC.ts` -- Screen Share Upgrade

**Video constraints** (line ~214):
- Change `getDisplayMedia` from `{ video: { frameRate: { ideal: 60 } }, audio: false }` to:
  ```
  video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } }
  audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, systemAudio: 'include' }
  ```

**Content hint + sender params** (after track is added):
- Set `videoTrack.contentHint = 'motion'` to tell the encoder to prioritize smooth motion over sharpness
- Keep `degradationPreference: 'maintain-resolution'` (already present)
- Add `maxBitrate: 8_000_000` (already present) AND `minBitrate: 2_000_000` floor to prevent quality drops

**SDP bitrate enforcement** (new helper function):
- Create a `patchSdpBitrate(sdp, maxKbps)` function that modifies the SDP answer/offer to inject `x-google-max-bitrate=8000` and `x-google-min-bitrate=2000` into the video codec line
- Apply this patch in `onnegotiationneeded` before setting local description

**System audio handling**:
- After `getDisplayMedia` resolves, check `stream.getAudioTracks()`:
  - If audio tracks exist: add each audio track to the peer connection as a separate sender (stored in a new `screenAudioSenderRef`)
  - If no audio tracks: show a toast "Audio not shared" via sonner, and proceed with video-only
- On `stopScreenShare`, also remove and stop the audio sender/tracks

**New refs**: `screenAudioSenderRef` to track screen share audio senders for cleanup.

**Reliability**: Wrap the entire `startScreenShare` in a try/catch. If `getDisplayMedia` throws (user cancelled), silently return. If the stream has no video tracks (edge case), return early.

#### 2. `src/components/server/ScreenShareViewer.tsx` -- Full-Screen Toggle

- Add a full-screen button (using `Maximize` / `Minimize` icons from lucide-react) next to the existing PiP button in the header bar
- The button calls `containerRef.current.requestFullscreen()` on the video container div (not the whole page)
- Track full-screen state via a `fullscreenchange` event listener on the container
- When in full-screen: show an "Exit Full Screen" button overlay, and the user can also press Esc (browser default behavior)
- Add a new ref `containerRef` for the video container div
- Play audio tracks from the stream by creating a hidden `<audio>` element (since the video element only plays video by default for MediaStreams with both tracks)

#### 3. `src/components/chat/VoiceCallUI.tsx` -- Full-Screen for DM Screen Share

- Apply the same full-screen toggle to the `VideoElement` component used in DM calls
- Add a `Maximize`/`Minimize` button next to the existing PiP button
- Use the same `requestFullscreen()` pattern on the video wrapper div
- Handle audio tracks in the remote screen stream the same way as ScreenShareViewer

#### 4. `src/i18n/en.ts` and `src/i18n/ar.ts` -- New Translation Keys

Add under the `calls` section:
- `fullScreen`: "Full Screen" / "ملء الشاشة"
- `exitFullScreen`: "Exit Full Screen" / "الخروج من ملء الشاشة"
- `audioNotShared`: "Audio not shared" / "لم تتم مشاركة الصوت"

---

### Technical Details

| Area | Detail |
|---|---|
| `getDisplayMedia` constraints | `video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } }`, `audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, systemAudio: 'include' }` |
| Content hint | `videoTrack.contentHint = 'motion'` after stream acquisition |
| Bitrate enforcement | SDP patching: inject `x-google-max-bitrate=8000;x-google-min-bitrate=2000` into video codec `a=fmtp` lines |
| Sender params | `maxBitrate: 8_000_000`, `degradationPreference: 'maintain-resolution'` (unchanged) |
| Screen audio | Separate `RTCRtpSender` for audio track, cleaned up on stop. Toast if no audio track present. |
| Full-screen | `element.requestFullscreen()` on the video container. `fullscreenchange` listener for state. Esc exits via browser default. |
| Audio playback | Hidden `<audio autoPlay>` element with `srcObject` set to the screen stream to play system audio on the receiver side |

### Files Modified

| File | Changes |
|---|---|
| `src/hooks/useWebRTC.ts` | Upgrade `startScreenShare` constraints, add `contentHint`, SDP bitrate patching, screen audio sender management, toast on no audio |
| `src/components/server/ScreenShareViewer.tsx` | Add full-screen toggle button, `containerRef`, fullscreen state listener, hidden audio element for system audio playback |
| `src/components/chat/VoiceCallUI.tsx` | Add full-screen toggle to `VideoElement`, hidden audio element for system audio |
| `src/i18n/en.ts` | Add `fullScreen`, `exitFullScreen`, `audioNotShared` keys |
| `src/i18n/ar.ts` | Add Arabic translations for the same keys |

