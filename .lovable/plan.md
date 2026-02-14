

## Screen Sharing Feature

### What This Does
Adds Discord-style screen sharing to both voice channels and 1-to-1 calls. Users can share their entire screen or a specific application window. Other participants see the shared screen in a video display area. A "Share Screen" button appears alongside existing call controls.

### How It Works

**Browser API**: Uses the standard `navigator.mediaDevices.getDisplayMedia()` API to capture a screen/window. This returns a video `MediaStream` that gets added to existing WebRTC peer connections so remote users receive it as a video track.

**Viewing**: When a remote user's screen share track arrives, it renders in a `<video>` element shown prominently in the UI. When sharing stops, the video area disappears.

---

### Changes

#### 1. Voice Channels -- `VoiceConnectionManager` + new `ScreenShareViewer`

**`src/components/server/VoiceConnectionBar.tsx`**

- Add a `screenStreamRef` to hold the display media stream
- Expose `startScreenShare` and `stopScreenShare` callbacks via a new context or by lifting state up through `VoiceChannelContext`
- `startScreenShare`: calls `getDisplayMedia({ video: true, audio: true })`, then adds the video track to all existing peer connections using `pc.addTrack()`
- Listen for the browser's native `track.onended` event (user clicks "Stop sharing" in the browser chrome) to auto-cleanup
- `stopScreenShare`: removes the video track from all peer connections and stops the stream
- On `pc.ontrack`: detect video tracks from remote peers and expose them via context for the viewer component
- Broadcast a `"voice-screen-share"` event via the signaling channel to notify peers that screen sharing started/stopped (includes the sharer's user ID)

**`src/contexts/VoiceChannelContext.tsx`**

- Add new state fields:
  - `isScreenSharing: boolean` -- whether the current user is sharing
  - `startScreenShare: () => Promise<void>`
  - `stopScreenShare: () => void`
  - `remoteScreenStream: MediaStream | null` -- the incoming screen share from another user
  - `screenSharerName: string | null` -- display name of who is sharing

**`src/components/server/ScreenShareViewer.tsx`** (new file)

- A component that renders the remote screen share video
- Shows a `<video>` element with the remote stream, auto-playing and fitting the container
- Displays a header bar: "{username} is sharing their screen"
- Appears between the channel sidebar and member list in `ServerView.tsx`

**`src/pages/ServerView.tsx`**

- Import and render `ScreenShareViewer` when `remoteScreenStream` is available from context
- The viewer takes up the main content area (stacking above/replacing the chat temporarily, or shown as a resizable panel)

**`src/components/server/ChannelSidebar.tsx`**

- Add a "Share Screen" button (monitor icon) in the voice connection status bar at the bottom, next to the disconnect button
- Toggles between start/stop screen share
- Shows a green/active indicator when sharing

#### 2. One-to-One Calls -- `useWebRTC` + `VoiceCallUI`

**`src/hooks/useWebRTC.ts`**

- Add `screenStreamRef` for the display media
- Add `startScreenShare` function: calls `getDisplayMedia()`, adds video track to the peer connection
- Add `stopScreenShare` function: removes video track and stops stream
- Add `remoteVideoRef` state: populated from `pc.ontrack` when a video track arrives
- Export `isScreenSharing`, `remoteScreenStream`, `startScreenShare`, `stopScreenShare`
- Handle the native `track.onended` event for auto-cleanup

**`src/components/chat/VoiceCallUI.tsx`**

- Add a "Share Screen" button (Monitor icon) in the controls row alongside mute/deafen/end
- When remote screen stream exists, render a `<video>` element above the call controls showing the shared screen
- Display "{name} is sharing their screen" label when viewing, or "You are sharing your screen" when sharing

**`src/pages/Chat.tsx`**

- Pass new screen sharing props from `useWebRTC` to `VoiceCallUI`

#### 3. Translations

**`src/i18n/en.ts`**

- `calls.shareScreen` -- "Share Screen"
- `calls.stopSharing` -- "Stop Sharing"
- `calls.userSharing` -- "{{name}} is sharing their screen"
- `calls.youAreSharing` -- "You are sharing your screen"

**`src/i18n/ar.ts`**

- Arabic equivalents for the above keys

---

### Technical Details

**Adding screen track to existing peer connections (voice channels)**:
```text
const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
const videoTrack = screenStream.getVideoTracks()[0];

// Add to all peer connections
peerConnectionsRef.current.forEach((pc) => {
  pc.addTrack(videoTrack, screenStream);
});

// Auto-stop when user clicks browser's "Stop sharing"
videoTrack.onended = () => stopScreenShare();
```

**Receiving screen share (detecting video vs audio)**:
```text
pc.ontrack = (event) => {
  if (event.track.kind === "video") {
    // This is a screen share -- expose stream to UI
    setRemoteScreenStream(event.streams[0]);
  } else {
    // Audio track -- play via Audio element (existing logic)
  }
};
```

**Renegotiation**: Adding a track to an active peer connection triggers renegotiation. The existing signaling channel handles this via the `negotiationneeded` event on the peer connection, which will need a handler to create and send a new offer.

### Files Modified
- `src/hooks/useWebRTC.ts` -- add screen share start/stop and remote video detection
- `src/components/chat/VoiceCallUI.tsx` -- add share screen button and video viewer
- `src/pages/Chat.tsx` -- pass screen sharing props
- `src/components/server/VoiceConnectionBar.tsx` -- add screen share logic for multi-peer voice channels
- `src/contexts/VoiceChannelContext.tsx` -- expose screen sharing state
- `src/components/server/ScreenShareViewer.tsx` -- new component for displaying shared screen
- `src/components/server/ChannelSidebar.tsx` -- add share screen button in voice bar
- `src/pages/ServerView.tsx` -- render screen share viewer
- `src/i18n/en.ts` -- new translation keys
- `src/i18n/ar.ts` -- Arabic translations

