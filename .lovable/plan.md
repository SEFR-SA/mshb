

## Plan: Add Message Editing to Server Channel Chat

The `ServerChannelChat.tsx` component never passes `onEdit` to `MessageContextMenu` or `MessageItem`, and has no editing state or inline edit UI. The DM `Chat.tsx` has all of this. We mirror that pattern.

### Changes — `src/components/server/ServerChannelChat.tsx`

**1. Add editing state** (near other state declarations ~line 330):
- `const [editingId, setEditingId] = useState<string | null>(null);`
- `const [editContent, setEditContent] = useState("");`

**2. Add edit save function** (near other handlers ~line 510):
```ts
const handleEditMessage = useCallback(async (msgId: string) => {
  if (!editContent.trim()) return;
  await supabase.from("messages").update({
    content: editContent.trim().slice(0, 5000),
    edited_at: new Date().toISOString()
  }).eq("id", msgId);
  setEditingId(null);
  setEditContent("");
}, [editContent]);
```

**3. Add `onEdit` to `MessageItem` interface and props** (line 84-110):
- Add `onEdit?: (id: string, content: string) => void` to `MessageItemProps`
- Destructure it in the component

**4. Pass `onEdit` to `MessageContextMenu`** (line 163-180):
- Add `onEdit={isMine ? onEdit : undefined}` prop

**5. Pass `onEdit` from parent to `MessageItem`** (line 708-734):
- Add `onEdit={(id, content) => { setEditingId(id); setEditContent(content); }}`

**6. Wire `onEdit` in `useMessageKeybinds`** (line 532):
- Change `onEdit: undefined` → `onEdit: (id, content) => { setEditingId(id); setEditContent(content); }`

**7. Add inline edit UI in message content area** (around line 248-276):
- When `editingId === msg.id`, render an `Input` + save/cancel buttons instead of the message content, matching the DM pattern from `Chat.tsx`.

**8. Pass `editingId` to `MessageItem`** so it can conditionally render the edit UI:
- Add `editingId`, `editContent`, `setEditContent`, `onEditSave`, `onEditCancel` props to `MessageItemProps`

Single file change: `src/components/server/ServerChannelChat.tsx`

