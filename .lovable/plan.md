

## Plan: Fix Message Deletion in Server Channels

The server channel chat has two bugs preventing delete from working visually:

1. **No hidden message tracking**: Unlike `Chat.tsx`, `ServerChannelChat.tsx` never loads or tracks `message_hidden` records. `handleDeleteForMe` inserts into the DB but doesn't update local state, so the message stays visible.

2. **`isDeleted` hardcoded to `false`**: Line 175 passes `isDeleted={false}` to `MessageContextMenu` instead of checking `msg.deleted_for_everyone`. This means "Delete for Everyone" updates the DB but the message still renders normally.

### Changes — `src/components/server/ServerChannelChat.tsx`

**1. Add `hiddenIds` state and fetch on mount** (mirror the DM pattern from `Chat.tsx`):
```ts
const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
// useEffect to fetch message_hidden for the user
```

**2. Update `handleDeleteForMe`** to also add to `hiddenIds` locally:
```ts
setHiddenIds(prev => new Set(prev).add(id));
```

**3. Filter messages** before rendering:
```ts
const visibleMessages = messages.filter(m => !hiddenIds.has(m.id));
```

**4. Fix `isDeleted` prop** in `MessageItem` (line 175):
```ts
isDeleted={!!msg.deleted_for_everyone}
```

**5. Update `handleDeleteForEveryone`** to also update the local message in realtime state so it renders as deleted immediately (via `updateRealtimeMessage` if available, or optimistic local update).

**6. Render deleted messages** with "[message deleted]" placeholder text (matching DM behavior) instead of hiding the context menu options.

Single file: `src/components/server/ServerChannelChat.tsx`

