

## Plan: Implement All Keybind Shortcuts

This is a large task touching multiple components. The core challenge is: **message keybinds require knowing which message is "focused/hovered"**, while **voice/call keybinds are global**.

### Architecture

1. **Create a global `useGlobalKeybinds` hook** — handles voice/call shortcuts that work app-wide
2. **Create a `useMessageKeybinds` hook** — handles message-level shortcuts, requires a "hovered message" tracking system
3. **Add hover tracking to message rendering** in Chat, GroupChat, and ServerChannelChat

### Key Design Decision

Message shortcuts (E, Backspace, P, +, F) are **single-key** — they must only fire when the user is NOT focused on a text input/textarea. The hook will check `document.activeElement` tag before acting.

---

### Step 1: Create `src/hooks/useGlobalKeybinds.ts`

Registers a global `keydown` listener for:

| Shortcut | Action | Condition |
|----------|--------|-----------|
| `Ctrl+Shift+M` | Toggle mute | Always (uses `toggleGlobalMute` from AudioSettingsContext) |
| `Ctrl+Shift+D` | Toggle deafen | Always (uses `toggleGlobalDeafen` from AudioSettingsContext) |

Mount this hook in `AppLayout.tsx`.

### Step 2: Add call keybinds to `CallListener.tsx`

Add a `keydown` listener inside CallListener:

| Shortcut | Action | Condition |
|----------|--------|-----------|
| `Ctrl+Enter` | Accept incoming call | Only when `incomingCall` is present |
| `Esc` | Decline incoming call | Only when `incomingCall` is present |

### Step 3: Add streaming keybinds to `VoiceCallUI.tsx`

Add a `keydown` listener:

| Shortcut | Action | Condition |
|----------|--------|-----------|
| `Ctrl+Alt+S` | Start streaming (open GoLive modal) | When in active call and not already sharing |
| `Ctrl+Alt+E` | End stream | When actively screen sharing |

### Step 4: Create `src/hooks/useMessageKeybinds.ts`

Accepts: `hoveredMessageId`, `messages`, `currentUserId`, and callback handlers (`onEdit`, `onDelete`, `onPin`, `onReaction`, `onForward`, `onCopy`, `onMarkUnread`).

Registers `keydown` for:

| Key | Action | Guard |
|-----|--------|-------|
| `E` | Edit (own msg only) | Not in input |
| `Backspace` | Delete for everyone (own) / Delete for me | Not in input |
| `P` | Pin toggle | Not in input |
| `+` | Add reaction | Not in input |
| `F` | Forward | Not in input |
| `Ctrl+C` | Copy text | Only when no text selection exists (to not override native copy) |
| `Alt+Enter` | Mark unread | Not in input |

All single-key shortcuts check: `!["INPUT","TEXTAREA","SELECT"].includes(document.activeElement?.tagName)` and `!document.activeElement?.isContentEditable`.

### Step 5: Add hovered message tracking to chat views

In `Chat.tsx`, `GroupChat.tsx`, and `ServerChannelChat.tsx`:

- Add `const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)`
- Add `onMouseEnter={() => setHoveredMsgId(msg.id)}` and `onMouseLeave={() => setHoveredMsgId(null)}` to each message row wrapper
- Wire `useMessageKeybinds` with the hovered message and existing action handlers

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useGlobalKeybinds.ts` | **New** — global mute/deafen keybinds |
| `src/hooks/useMessageKeybinds.ts` | **New** — message-level keybinds |
| `src/components/layout/AppLayout.tsx` | Mount `useGlobalKeybinds` |
| `src/components/chat/CallListener.tsx` | Add Ctrl+Enter / Esc for incoming calls |
| `src/components/chat/VoiceCallUI.tsx` | Add Ctrl+Alt+S / Ctrl+Alt+E for streaming |
| `src/pages/Chat.tsx` | Add hover tracking + `useMessageKeybinds` |
| `src/pages/GroupChat.tsx` | Add hover tracking + `useMessageKeybinds` |
| `src/components/server/ServerChannelChat.tsx` | Add hover tracking + `useMessageKeybinds` |

