

## Video Call & Picture-in-Picture Features

### What This Does
1. **Video Call**: Adds a camera toggle button to both 1-to-1 calls and server voice channels, allowing users to share their webcam feed alongside audio. The remote camera feed displays as a video element in the call UI.
2. **Picture-in-Picture (PiP)**: Adds a PiP button on screen share and video viewers so users can pop the video into a floating browser-native PiP window, letting them continue chatting while watching.

---

### Changes

#### 1. Video Call in 1-to-1 Calls

**`src/hooks/useWebRTC.ts`**

- Add state: `isCameraOn`, `localCameraStream`, `remoteCameraStream`
- Add refs: `cameraStreamRef`, `cameraSenderRef`
- Add `startCamera()`: calls `getUserMedia({ video: true })`, adds video track to peer connection (triggers renegotiation)
- Add `stopCamera()`: removes video track sender, stops camera stream
- Update `pc.ontrack`: distinguish between camera video tracks and screen share video tracks using a label/metadata convention -- screen share tracks come from `getDisplayMedia` and camera tracks from `getUserMedia`. We'll track which sender is which to differentiate. A simpler approach: maintain a `isScreenSharing` flag and when a second video track arrives while the local user is NOT screen sharing, treat it as a camera feed.
- Actually, the cleanest approach: use stream IDs. Screen share streams and camera streams have different stream objects. We'll broadcast a signaling message (`"camera-toggle"`) so the remote side knows which stream is camera vs screen.
- Export: `isCameraOn`, `remoteCameraStream`, `startCamera`, `stopCamera`
- Cleanup camera on `cleanup()`

**`src/components/chat/VoiceCallUI.tsx`**

- Add props: `isCameraOn`, `remoteCameraStream`, `localCameraStream`, `onStartCamera`, `onStopCamera`
- Add `Video`/`VideoOff` icons from lucide-react
- Add camera toggle button in the controls row (between deafen and screen share)
- When `remoteCameraStream` exists, show a video element displaying the remote camera (smaller than screen share, circular or rectangular with rounded corners)
- When `localCameraStream` exists, show a small self-view in the corner (picture-in-picture style overlay)
- Add a PiP button (lucide `PictureInPicture2` icon) on remote video elements (both screen share and camera) that calls `videoElement.requestPictureInPicture()`

**`src/pages/Chat.tsx`**

- Destructure new `isCameraOn`, `remoteCameraStream`, `startCamera`, `stopCamera` from `useWebRTC`
- Pass them as props to `VoiceCallUI`

#### 2. Video Call in Server Voice Channels

**`src/contexts/VoiceChannelContext.tsx`**

- Add state: `isCameraOn`, `remoteCameraStream`, `localCameraStream`
- Add setters for all three

**`src/components/server/VoiceConnectionBar.tsx`**

- Add `cameraStreamRef`, `cameraSendersRef` (Map of peerId to sender)
- Add `startCamera()`: calls `getUserMedia({ video: true })`, adds video track to all peer connections
- Add `stopCamera()`: removes video senders, stops stream
- Broadcast `"voice-camera"` signaling event with userId and on/off state
- In `pc.ontrack`: detect video tracks -- differentiate camera vs screen by checking signaling events. When a `"voice-camera"` event is received with `sharing: true`, mark the next incoming video track from that peer as camera.
- Expose camera streams via `VoiceChannelContext`
- Listen for `"toggle-camera"` CustomEvent from ChannelSidebar (same pattern as screen share)

**`src/components/server/ChannelSidebar.tsx`**

- Add a camera toggle button in the voice connection bar (next to screen share button)
- Dispatches `"toggle-camera"` CustomEvent

**`src/pages/ServerView.tsx`**

- When `remoteCameraStream` exists from context, render a camera video viewer (similar to ScreenShareViewer but styled as a smaller video feed)

#### 3. Picture-in-Picture Mode

**`src/components/chat/VoiceCallUI.tsx`**

- Add a PiP button (small icon button) overlaid on the `ScreenShareVideo` and camera video components
- On click, calls `videoRef.current.requestPictureInPicture()`
- The `ScreenShareVideo` sub-component will be updated to accept an optional `showPiP` prop and render the button

**`src/components/server/ScreenShareViewer.tsx`**

- Add a PiP button in the header bar next to the sharer name
- On click, calls `videoRef.current.requestPictureInPicture()`

#### 4. Translations

**`src/i18n/en.ts`**

- `calls.startCamera` -- "Start Camera"
- `calls.stopCamera` -- "Stop Camera"
- `calls.pip` -- "Picture in Picture"
- `calls.userCamera` -- "{{name}}'s camera"

**`src/i18n/ar.ts`**

- Arabic equivalents

---

### Technical Details

**Differentiating camera vs screen share video tracks**: Since WebRTC `ontrack` events don't inherently label the source, we use signaling. When a user starts their camera, they broadcast a `"camera-toggle"` event. The remote side stores a flag per peer so when the next video track arrives, it knows whether it's camera or screen share. In 1-to-1 calls, we can track this more simply since there's only one peer.

**Picture-in-Picture API usage**:
```text
const handlePiP = async (videoRef) => {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
  } else if (videoRef.current) {
    await videoRef.current.requestPictureInPicture();
  }
};
```

**Camera video layout in VoiceCallUI**:
- Remote camera: displayed as a rounded rectangle (max 300px) above the avatar area
- Local camera (self-view): small 120x90 overlay in the bottom-right corner of the call area
- PiP button: small icon in the top-right corner of each video element

### Files Modified
- `src/hooks/useWebRTC.ts` -- add camera start/stop/stream management
- `src/components/chat/VoiceCallUI.tsx` -- add camera button, video display, PiP buttons, self-view
- `src/pages/Chat.tsx` -- pass camera props to VoiceCallUI
- `src/components/server/VoiceConnectionBar.tsx` -- add camera logic for multi-peer
- `src/contexts/VoiceChannelContext.tsx` -- add camera state
- `src/components/server/ChannelSidebar.tsx` -- add camera toggle button in voice bar
- `src/components/server/ScreenShareViewer.tsx` -- add PiP button
- `src/pages/ServerView.tsx` -- render camera viewer
- `src/i18n/en.ts` -- new translation keys
- `src/i18n/ar.ts` -- Arabic translations

