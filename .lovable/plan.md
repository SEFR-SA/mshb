

## Add Reaction & Forward Message — Implementation Plan

### Phase 1: Database Migration

Add `is_forwarded` boolean column to `messages` table:

```sql
ALTER TABLE public.messages ADD COLUMN is_forwarded boolean NOT NULL DEFAULT false;
```

Single column addition, no RLS changes needed (existing INSERT/UPDATE policies cover it).

---

### Phase 2: Wire "Add Reaction" from Context Menu

**Problem:** The context menu closes when clicked, so we can't open a picker inside it. We need to pass a callback that opens the reaction picker on the message bubble *after* the menu closes.

**Approach:**
- Add `onAddReaction?: (messageId: string) => void` prop to `MessageContextMenu`
- Replace the placeholder toast with `onAddReaction(messageId)`
- In each chat component (`Chat.tsx`, `GroupChat.tsx`, `ServerChannelChat.tsx`):
  - Add state: `reactionPickerMsgId: string | null`
  - Pass `onAddReaction={(id) => setReactionPickerMsgId(id)}` to `MessageContextMenu`
  - In `MessageReactions`, add a `forceOpen` prop that auto-opens the popover when the message ID matches
  - When the picker closes, reset `reactionPickerMsgId` to null

This reuses the existing `MessageReactions` emoji picker — no new picker components.

**Files modified:** `MessageContextMenu.tsx`, `MessageReactions.tsx`, `Chat.tsx`, `GroupChat.tsx`, `ServerChannelChat.tsx`

---

### Phase 3: Forward Message — Global Modal

**Follow existing patterns** (`ReportModalContext` / `UserProfileContext`):

1. **Create `src/contexts/ForwardMessageContext.tsx`** — holds `isOpen`, `messageContent`, `fileUrl`, `fileName`, `fileType`, `fileSize`, `openForwardModal(...)`, `closeForwardModal()`

2. **Create `src/components/chat/ForwardMessageModal.tsx`** — responsive Dialog/Drawer:
   - Search bar at top
   - Fetches DM threads + group threads (reuse the exact pattern from `ForwardImageDialog.tsx`)
   - Also fetches server channels the user belongs to
   - Click a row → inserts a new message with `is_forwarded: true` into that thread/channel
   - Shows success toast + closes

3. **Register in `App.tsx`** — wrap with `ForwardMessageProvider`, render `<ForwardMessageModal />`

**Files created:** `ForwardMessageContext.tsx`, `ForwardMessageModal.tsx`
**Files modified:** `App.tsx`

---

### Phase 4: Wire Forward & Forwarded Indicator

1. **`MessageContextMenu.tsx`** — add `onForward` prop, replace forward placeholder with it

2. **Chat components** (`Chat.tsx`, `GroupChat.tsx`, `ServerChannelChat.tsx`):
   - Import `useForwardMessage` context
   - Pass `onForward` to `MessageContextMenu` that calls `openForwardModal(content, fileUrl, ...)`
   - In message bubble rendering: if `(msg as any).is_forwarded`, render a small muted line above the content: `↪ Forwarded` with the Forward lucide icon

3. **i18n** — add keys for `actions.forwarded`, `forward.title`, `forward.search`, `forward.success`, `forward.servers`, `forward.dms`, `forward.groups` to `en.ts` and `ar.ts`

---

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | `ALTER TABLE messages ADD COLUMN is_forwarded` |
| `src/components/chat/MessageContextMenu.tsx` | Add `onAddReaction` + `onForward` props |
| `src/components/chat/MessageReactions.tsx` | Add `forceOpen` prop |
| `src/contexts/ForwardMessageContext.tsx` | **New** |
| `src/components/chat/ForwardMessageModal.tsx` | **New** |
| `src/pages/Chat.tsx` | Wire reaction picker state + forward |
| `src/pages/GroupChat.tsx` | Same wiring |
| `src/components/server/ServerChannelChat.tsx` | Same wiring |
| `src/App.tsx` | Add ForwardMessage provider + modal |
| `src/i18n/en.ts` + `ar.ts` | New translation keys |

