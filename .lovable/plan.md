

## Enhanced Voice Call UI -- Discord-Style Split Panel

### Overview
Replace the current thin call indicator bar with a full Discord-style voice call panel that splits the chat area vertically. When a call is active, the top portion of the chat becomes a dedicated call interface showing avatars, status, duration, and controls -- while the messages and composer remain visible below.

### UI Design

**Ringing State** (waiting for the other person to answer):
- Dark panel taking roughly 40% of the chat height
- Other user's avatar (large, centered) with a pulsing ring animation
- "Calling [Name]..." text
- Subtle animated dots or pulse effect to indicate waiting
- End Call (red) button centered below

**Connected State** (call in progress):
- Same dark panel area
- Both users' avatars side by side (or the other user's avatar prominently)
- Green "Connected" badge
- Live duration timer (MM:SS) prominently displayed
- Control buttons row: Mute/Unmute, End Call
- Subtle audio wave animation to indicate active call

**Layout Split**:
```text
+------------------------------------------+
|  Chat Header (with call button grayed)   |
+------------------------------------------+
|                                          |
|          VOICE CALL PANEL                |
|    [Avatar]   Calling User...            |
|              00:23                       |
|       [Mute]  [End Call]                 |
|                                          |
+------------------------------------------+
|  Messages area (scrollable, shorter)     |
|  ...                                     |
+------------------------------------------+
|  Composer                                |
+------------------------------------------+
```

### Changes

**`src/components/chat/VoiceCallUI.tsx`** -- Complete redesign:
- Instead of a single-line bar, render a vertical panel with `min-h-[200px]` and dark background (`bg-background/95` or similar)
- **Ringing**: Large avatar with pulse animation ring, "Calling [Name]..." text, single End Call button
- **Connected**: Avatar with green status dot, "[Name] -- Connected" label, `MM:SS` timer in large text, row of control buttons (Mute + End Call)
- Accept `otherAvatar` prop (avatar URL) in addition to `otherName`
- Smooth transitions between states using CSS transitions

**`src/pages/Chat.tsx`** -- Pass avatar to VoiceCallUI:
- Pass `otherProfile?.avatar_url` as a new `otherAvatar` prop to `VoiceCallUI`

### VoiceCallUI Component Details

Props to add:
- `otherAvatar?: string` -- avatar URL of the other user

Ringing layout:
- Container: `flex flex-col items-center justify-center gap-4 py-8 bg-card/80 backdrop-blur border-b`
- Large avatar (80x80) with animated pulsing ring border (`animate-pulse` on a ring element around the avatar)
- Text: "Calling [otherName]..." with `animate-pulse` opacity
- End Call button (red, rounded pill shape)

Connected layout:
- Container: same base styling, slightly different background tint (green accent)
- Large avatar (72x72) with a small green dot
- Name + "Connected" label
- Duration timer in `text-2xl font-mono`
- Button row: Mute toggle (ghost style, changes icon) + End Call (destructive)

### Files to Modify

| File | Changes |
|------|--------|
| `src/components/chat/VoiceCallUI.tsx` | Full redesign with split panel UI |
| `src/pages/Chat.tsx` | Pass `otherAvatar` prop |

No database or i18n changes needed -- existing translation keys (`calls.calling`, `calls.connected`, etc.) already cover everything.

