

## Move Voice Disconnect Button to Sidebar

### Overview
Remove the `VoiceConnectionBar` from below the chat area in `ServerView.tsx` and instead show a "Disconnect" button in the sidebar's button row (next to Settings, Mute, Deafen) that only appears when connected to a voice channel. The WebRTC/audio logic currently in `VoiceConnectionBar` will be preserved but restructured.

### Problem
Voice channel state (`voiceChannel`) currently lives in `ServerView.tsx`, but the sidebar lives in `AppLayout.tsx`. These are separate components, so we need a way to share voice connection state.

### Approach
Create a new `VoiceChannelContext` to share voice connection state globally. This allows `AppLayout.tsx` to know when a user is in a voice channel and show/hide the disconnect button.

### Changes

**1. New file: `src/contexts/VoiceChannelContext.tsx`**
- Create a React Context that holds:
  - `voiceChannel: { id, name, serverId } | null` -- the currently connected voice channel
  - `setVoiceChannel(channel)` -- join a voice channel
  - `disconnectVoice()` -- leave the current voice channel
- This is a thin state holder; the actual WebRTC logic stays in `VoiceConnectionBar`

**2. `src/main.tsx` or `src/App.tsx`**
- Wrap the app with `VoiceChannelProvider`

**3. `src/pages/ServerView.tsx`**
- Replace the local `voiceChannel` state with the context (`useVoiceChannel()`)
- Remove `VoiceConnectionBar` from both mobile and desktop renders entirely (lines 156-158, 172-174)
- Keep the `VoiceConnectionBar` mounted but move it inside the `ChannelSidebar` area or keep it hidden -- actually, the WebRTC connection logic needs to stay active. We will keep `VoiceConnectionBar` rendered but make it invisible (no UI), only handling WebRTC connections
- Remove the visible bar UI from `VoiceConnectionBar` and keep only the connection logic

**4. `src/components/server/VoiceConnectionBar.tsx`**
- Remove the visible UI (the bar with avatars and disconnect button)
- Keep only the WebRTC connection logic (auto-join, signaling, peer connections, volume monitoring, cleanup)
- It becomes a "headless" component that manages the voice connection lifecycle
- The `onDisconnect` callback will call `disconnectVoice()` from context

**5. `src/components/layout/AppLayout.tsx`**
- Import `useVoiceChannel` from the new context
- In the button row (line 88), conditionally render a `PhoneOff` disconnect button when `voiceChannel` is not null
- Also show the voice channel name next to it so the user knows which channel they are in
- Style: a small row above the existing buttons showing "Connected to #channel-name" with a red disconnect button

### Visual Layout (Sidebar Bottom)

```text
+--------------------------------------+
| Connected: #voice-channel   [Hang up]|  <-- only when in voice
+--------------------------------------+
| [Install] [Settings] [Mute] [Deafen] |
+--------------------------------------+
| [Avatar+Status]  DisplayName         |
|                  @username            |
+--------------------------------------+
```

### Files Modified
- **New**: `src/contexts/VoiceChannelContext.tsx`
- **Modified**: `src/App.tsx` -- wrap with VoiceChannelProvider
- **Modified**: `src/pages/ServerView.tsx` -- use context instead of local state, remove VoiceConnectionBar from render
- **Modified**: `src/components/server/VoiceConnectionBar.tsx` -- remove visible UI, keep only WebRTC logic as headless component
- **Modified**: `src/components/layout/AppLayout.tsx` -- add conditional disconnect button in sidebar

