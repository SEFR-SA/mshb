

## Fix: "Cannot read properties of undefined (reading 'toLocaleTimeString')" crash

### Root Cause

`updateRealtimeMessage` in `useInfiniteMessages.ts` (line 188) **replaces** the entire message object instead of **merging** the update into the existing message:

```ts
// Current (broken): full replacement
page.map((m: any) => (m.id === updated.id ? updated : m))
```

When `handleDeleteForEveryone` calls `updateRealtimeMessage({ id, deleted_for_everyone: true, content: "" })`, the message loses `created_at`, `author_id`, and all other fields. Then `formatTime(msg.created_at)` receives `undefined` and crashes.

### Fix

**File: `src/hooks/useInfiniteMessages.ts`, line 188** — Change replacement to merge:

```ts
// Fixed: merge update into existing message
page.map((m: any) => (m.id === updated.id ? { ...m, ...updated } : m))
```

This single-character change (`{ ...m, ...updated }` instead of `updated`) fixes:
1. The delete-for-everyone crash (missing `created_at`)
2. Any future partial updates that don't include all fields

No other files need changes.

