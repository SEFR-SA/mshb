

## Discord-Style Persistent Voice Call with Text Channel Browsing

### Current Behavior
When a voice channel is clicked, the entire main content area is replaced with `VoiceChannelPanel`, blocking access to text channels.

### New Behavior
Like Discord: joining a voice channel shows a small **voice status bar** at the bottom of the screen (showing channel name, mute/disconnect controls, and participant count). The main content area continues to show whichever **text channel** the user navigates to. Users can freely browse text channels while remaining connected to voice.

### Architecture Change

The voice session becomes **server-level state** managed in `ServerView.tsx`, not tied to which channel is "active" in the main content area.

```text
+------------------+-------------------------------------+-----------------+
| Channel Sidebar  |   Text Channel Chat (always shown)  | Member List     |
|                  |                                     |                 |
|                  |                                     |                 |
|                  +-------------------------------------+                 |
|                  | [Voice Bar: "chilling" | Mute | Disconnect]          |
+------------------+-------------------------------------+-----------------+
```

### Changes

**`src/pages/ServerView.tsx`**
- Add state: `voiceChannel: { id, name } | null` to track the active voice session independently from the viewed text channel
- When a voice channel is clicked in the sidebar, set `voiceChannel` state (don't change `activeChannel` -- keep showing current text channel)
- If no text channel is active when voice is clicked, auto-select the first text channel for the main area
- Render `VoiceConnectionBar` at the bottom of the main content area when `voiceChannel` is set
- The main content area always renders `ServerChannelChat` (never `VoiceChannelPanel` full-screen)

**`src/components/server/VoiceConnectionBar.tsx`** (new)
- A compact bottom bar showing: voice channel name, participant avatars (small), mute toggle, disconnect button
- Contains all WebRTC logic (extracted from current `VoiceChannelPanel`)
- Auto-joins voice on mount, leaves on unmount or disconnect click
- Shows participant count and mute state

**`src/components/server/VoiceChannelPanel.tsx`**
- Remove WebRTC/join/leave logic (moved to `VoiceConnectionBar`)
- Keep it as a read-only display: when a voice channel is clicked, it could optionally show a "join voice" prompt or participant grid, but the main content area stays as text chat
- Alternatively, this component is no longer rendered full-screen -- its participant grid can be embedded inside `VoiceConnectionBar` as an expandable section

**`src/components/server/ChannelSidebar.tsx`**
- Voice channel click behavior changes: instead of calling `onChannelSelect` with type "voice", call a new `onVoiceChannelSelect` callback
- Text channel clicks continue working as before

### Detailed Flow

1. User clicks a voice channel in the sidebar
2. `ServerView` sets `voiceChannel = { id, name }` and keeps the current text channel visible
3. `VoiceConnectionBar` mounts at the bottom, acquires mic, joins the voice channel (inserts into `voice_channel_participants`, sets up WebRTC signaling)
4. User can click any text channel -- the main area updates to show that text channel's chat
5. The voice bar persists at the bottom across text channel navigation
6. Clicking "Disconnect" in the bar clears `voiceChannel`, unmounts the bar, leaves the voice session

### Technical Details

**VoiceConnectionBar layout:**
```text
+-------------------------------------------------------+
| [green dot] chilling  [avatar][avatar]  [Mute] [Hang] |
+-------------------------------------------------------+
```

**Props for VoiceConnectionBar:**
```typescript
interface VoiceConnectionBarProps {
  channelId: string;
  channelName: string;
  serverId: string;
  onDisconnect: () => void;
}
```

**ServerView state changes:**
```typescript
const [activeTextChannel, setActiveTextChannel] = useState<Channel | null>(null);
const [voiceChannel, setVoiceChannel] = useState<{ id: string; name: string } | null>(null);
```

**ChannelSidebar prop changes:**
```typescript
interface Props {
  serverId: string;
  activeChannelId?: string;
  onChannelSelect?: (channel: Channel) => void;
  onVoiceChannelSelect?: (channel: { id: string; name: string }) => void;
}
```

### Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/server/VoiceConnectionBar.tsx` | Create | Compact bottom bar with WebRTC voice, mute, disconnect |
| `src/pages/ServerView.tsx` | Modify | Separate voice state from text channel state; always render text chat; render VoiceConnectionBar when in voice |
| `src/components/server/ChannelSidebar.tsx` | Modify | Add `onVoiceChannelSelect` prop; voice clicks use new callback |
| `src/components/server/VoiceChannelPanel.tsx` | Modify | Simplify to just a join prompt / participant display (no longer full-screen replacement) |
| `src/i18n/en.ts` | Modify | Add voice bar translation keys |
| `src/i18n/ar.ts` | Modify | Add Arabic voice bar translations |

