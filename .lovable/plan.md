

## Block User & Close DM — Implementation Plan

### Phase 1: Database Migration

Single migration with both tables, using the corrected FK references with `ON DELETE CASCADE`. Per the memory note on database conventions, we avoid FK refs to `auth.users` — but the user explicitly requested them, so we'll include them as specified.

```sql
-- blocked_users
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own blocks" ON public.blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can block others" ON public.blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON public.blocked_users FOR DELETE USING (auth.uid() = blocker_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_users;

-- dm_thread_visibility
CREATE TABLE public.dm_thread_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_visible boolean NOT NULL DEFAULT true,
  closed_at timestamptz,
  UNIQUE (thread_id, user_id)
);
ALTER TABLE public.dm_thread_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own visibility" ON public.dm_thread_visibility FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own visibility" ON public.dm_thread_visibility FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own visibility" ON public.dm_thread_visibility FOR UPDATE USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_thread_visibility;
```

### Phase 2: Frontend Hooks

**`src/hooks/useBlockUser.ts`** — New file
- Fetches `blocked_users` where `blocker_id = user.id` on mount
- Subscribes to realtime changes on `blocked_users`
- Exposes: `blockedUserIds: Set<string>`, `blockUser(id)`, `unblockUser(id)`, `isBlocked(id)`
- `blockUser` inserts row + shows toast; `unblockUser` deletes row + shows toast

**`src/hooks/useCloseDM.ts`** — New file
- Single function: `closeDM(threadId)` that calls `.upsert({ thread_id, user_id, is_visible: false, closed_at: new Date().toISOString() }, { onConflict: 'thread_id,user_id' })`
- Shows success toast

### Phase 3: Update HomeSidebar DM Fetching

In `HomeSidebar.tsx` `loadInbox()`, before the `dm_threads` query:
1. Query `dm_thread_visibility` for `user_id = auth.uid()` where `is_visible = false` → get array of closed `thread_id`s
2. If any closed IDs exist, filter `dm_threads` query with `.not('id', 'in', '(${closedIds.join(",")})')`
3. Add `dm_thread_visibility` to the realtime subscription channel

### Phase 4: Wire Context Menus

**`ThreadContextMenu.tsx`**:
- Add `onCloseDM` and `onBlock` callback props (optional)
- Replace "Close DM" toast with `onCloseDM?.()` call
- Replace "Block" toast with `onBlock?.()` call

**`HomeSidebar.tsx`**:
- Import `useBlockUser` and `useCloseDM` hooks
- Pass `onCloseDM` (calls `closeDM(thread.id)` then triggers reload) to `ThreadContextMenu`
- Pass `onBlock` (calls `blockUser(otherUserId)`) to `ThreadContextMenu`
- Need to thread `otherUserId` through to the context menu — add it as a prop on `ThreadContextMenu`

**`UserContextMenu.tsx`**:
- Import `useBlockUser`, replace "Block" toast with actual `blockUser(targetUserId)` call
- Show "Unblock" instead when already blocked

**`FriendsDashboard.tsx`** (Blocked tab):
- Import `useBlockUser` hook
- Replace the empty "No blocked users" placeholder with a list of blocked users (query `profiles` by `blockedUserIds`)
- Each blocked user row has an "Unblock" button calling `unblockUser`

### Files to Create/Modify

| File | Action |
|------|--------|
| DB Migration | Create `blocked_users` + `dm_thread_visibility` |
| `src/hooks/useBlockUser.ts` | **New** |
| `src/hooks/useCloseDM.ts` | **New** |
| `src/components/chat/ThreadContextMenu.tsx` | Add callback props, wire them |
| `src/components/chat/UserContextMenu.tsx` | Wire block/unblock |
| `src/components/layout/HomeSidebar.tsx` | Filter closed DMs, pass callbacks |
| `src/pages/FriendsDashboard.tsx` | Wire Blocked tab |

