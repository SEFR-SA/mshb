

# Last Seen Timestamps and Unread Message Counts

## Overview
Two features: (1) show "Last seen X ago" for offline users in the chat header and inbox, and (2) add unread message count badges to inbox threads and the Messages nav item.

---

## Feature 1: Last Seen Timestamps

The `profiles` table already has a `last_seen` column (timestamptz), and `usePresence` already updates it every 60 seconds. The `presence.lastSeen` translation key already exists in both EN and AR.

### Changes

**`src/pages/Chat.tsx`** (lines 211-213):
- Replace the static "Online"/"Offline" text with logic:
  - If online: show "Online" 
  - If offline and `otherProfile.last_seen` exists: show "Last seen 5m ago" using `formatDistanceToNow`
  - If offline and no `last_seen`: show "Offline"

**`src/pages/Inbox.tsx`** (lines 222-224):
- Below the last message snippet, show a small "Last seen X ago" line for offline users in each thread item.
- Only show when user is offline and has a `last_seen` value.

**`src/hooks/usePresence.ts`**:
- Update `last_seen` on initial track (not just every 60s) so it's populated immediately.

No database changes needed -- the column and translations already exist.

---

## Feature 2: Unread Message Counts

### Approach
Track the last time a user read each thread. Count messages in each thread created after that timestamp as "unread."

### Database Migration
Create a new table `thread_read_status`:
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, not null)
- `thread_id` (uuid, not null)
- `last_read_at` (timestamptz, not null, default now())
- Unique constraint on (user_id, thread_id)
- RLS: users can only read/insert/update their own rows

### Code Changes

**`src/pages/Chat.tsx`**:
- When chat opens and on each new incoming message, upsert `thread_read_status` for the current user/thread with `last_read_at = now()`.

**`src/pages/Inbox.tsx`**:
- In `loadThreads`, for each thread:
  1. Fetch the user's `last_read_at` from `thread_read_status`
  2. Count messages in that thread where `created_at > last_read_at` and `author_id != current user`
  3. Store as `unreadCount` on the thread object
- Display a purple badge with the count next to each thread item (if count > 0).

**`src/hooks/useUnreadCount.ts`** (new):
- A custom hook that computes the total unread count across all threads.
- Subscribes to realtime message inserts and thread_read_status changes to stay up-to-date.
- Returns `totalUnread: number`.

**`src/components/layout/AppLayout.tsx`**:
- Import `useUnreadCount` hook.
- Show a small red/purple badge with total unread count on the Messages nav item (both desktop sidebar and mobile bottom nav), only if count > 0.

### i18n
No new translations needed -- the badge is just a number.

---

## Technical Details

### Files Modified
- **New migration** -- creates `thread_read_status` table with RLS
- **`src/pages/Chat.tsx`** -- mark thread as read on open; show "Last seen X ago"
- **`src/pages/Inbox.tsx`** -- fetch unread counts; show badge; show last seen for offline users
- **`src/hooks/useUnreadCount.ts`** (new) -- total unread count hook with realtime
- **`src/hooks/usePresence.ts`** -- update last_seen on initial presence track
- **`src/components/layout/AppLayout.tsx`** -- unread badge on Messages nav item

### thread_read_status Table Schema
```text
id         | uuid        | PK, gen_random_uuid()
user_id    | uuid        | NOT NULL
thread_id  | uuid        | NOT NULL
last_read_at | timestamptz | NOT NULL, default now()
UNIQUE(user_id, thread_id)
```

### RLS Policies
- SELECT: `auth.uid() = user_id`
- INSERT: `auth.uid() = user_id`
- UPDATE: `auth.uid() = user_id`

