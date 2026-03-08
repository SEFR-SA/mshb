

## DM Unread Badges Not Clearing — Fix Plan

### Root Cause
`HomeSidebar.tsx` (line 230-239) subscribes to realtime changes on `messages`, `dm_threads`, `group_threads`, `group_members`, `dm_thread_visibility`, `blocked_users`, and `pinned_chats` — but **not** `thread_read_status`. When you open a DM chat, `Chat.tsx` upserts `thread_read_status` to mark messages as read, but HomeSidebar never hears about it and keeps showing the stale badge.

The same issue exists in `ChatSidebar.tsx` (the mobile equivalent).

### Fix

**1. `src/components/layout/HomeSidebar.tsx`** (line ~230-239)
- Add `.on("postgres_changes", { event: "*", schema: "public", table: "thread_read_status" }, () => loadInbox())` to the existing realtime channel subscription.

**2. `src/components/chat/ChatSidebar.tsx`**
- Same fix — add `thread_read_status` to its realtime subscription so mobile badges also clear.

Two one-line additions. No new files, no architectural changes.

