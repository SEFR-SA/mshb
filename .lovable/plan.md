

## Additional Missing Realtime Subscriptions

After a second thorough pass, here are the areas still lacking realtime that were not addressed in the previous batch:

---

### 1. Server Settings — EmojisTab (no realtime)
**File:** `src/components/server/settings/EmojisTab.tsx`
- Fetches emojis once on mount (line 76-79), no `postgres_changes` subscription on `server_emojis`.
- **Impact:** If another admin uploads/deletes emojis while you have the tab open, nothing updates.
- **Fix:** Add realtime listener on `server_emojis` filtered by `server_id`.

### 2. Server Settings — StickersTab (no realtime)
**File:** `src/components/server/settings/StickersTab.tsx`
- Same pattern as EmojisTab. Fetches once, no subscription on `server_stickers`.
- **Fix:** Add realtime listener on `server_stickers` filtered by `server_id`.

### 3. Server Settings — SoundboardTab (no realtime)
**File:** `src/components/server/settings/SoundboardTab.tsx`
- Fetches sounds once on mount (line 76-79), no realtime.
- **Fix:** Add realtime listener on `server_soundboard` filtered by `server_id`.

### 4. Server Settings — ServerSettingsDialog itself (no realtime on server info)
**File:** `src/components/server/ServerSettingsDialog.tsx` (lines 69-89)
- Fetches server name/icon/banner/owner once when dialog opens. No realtime on `servers` table.
- **Impact:** If another admin changes the server name/icon while dialog is open, the profile tab shows stale data.
- **Fix:** Add realtime listener on `servers` filtered by `id=eq.${serverId}` to update local state.

### 5. Server Settings — AuditLogView (no realtime)
**File:** `src/components/server/AuditLogView.tsx` (lines 55-84)
- Fetches audit logs once on mount. New audit log entries won't appear until re-opening.
- **Fix:** Add realtime listener on `server_audit_logs` filtered by `server_id`.

### 6. ServerRail — Folders not realtime
**File:** `src/components/server/ServerRail.tsx` (lines 130-174)
- Has realtime on `server_members` and `servers`, but **not** on `server_folders` or `server_folder_items`.
- **Impact:** Creating/renaming/deleting folders or moving servers between folders from another session won't update.
- **Fix:** Add `server_folders` and `server_folder_items` to the existing realtime channel.

### 7. Chat.tsx — Other user's profile not realtime
**File:** `src/pages/Chat.tsx`
- The DM partner's profile (display name, avatar, status) is fetched once. If they change their avatar or name during the conversation, it stays stale.
- **Fix:** Add realtime listener on `profiles` filtered by `user_id=eq.${otherUserId}` to update `otherProfile`.

---

### Summary Table

| Priority | Area | File |
|----------|------|------|
| Medium | EmojisTab | `settings/EmojisTab.tsx` |
| Medium | StickersTab | `settings/StickersTab.tsx` |
| Medium | SoundboardTab | `settings/SoundboardTab.tsx` |
| Medium | ServerSettingsDialog server info | `ServerSettingsDialog.tsx` |
| Low | AuditLogView | `AuditLogView.tsx` |
| Medium | ServerRail folders | `ServerRail.tsx` |
| Medium | Chat.tsx other user profile | `Chat.tsx` |

### Implementation

Same pattern as before — add `useEffect` with `supabase.channel().on("postgres_changes", ...).subscribe()` and re-fetch on event. No migration needed since `server_emojis`, `server_stickers`, `server_audit_logs`, `server_folders`, and `server_folder_items` already have realtime enabled or just need the publication addition in one migration.

**Database migration** will add these tables to the realtime publication:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_emojis;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_stickers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_folders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_folder_items;
```

Then each component gets a new `useEffect` block with the appropriate subscription and cleanup.

