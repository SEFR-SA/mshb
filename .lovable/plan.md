

## Realtime Audit: Missing Subscriptions Across the Codebase

After thorough analysis, here are the components/areas that **lack realtime subscriptions** and require you to navigate away and back to see changes:

---

### 1. Group Chat — Group Info Updates (name, avatar, members joining/leaving)
**File:** `src/pages/GroupChat.tsx` (lines 116-157)
- Group name, avatar, member count, member roles, and profiles are fetched once on mount with no realtime subscription on `group_threads`, `group_members`, or `profiles`.
- **Impact:** If someone changes the group name/avatar, or a member joins/leaves, you won't see it until you navigate away and back.
- **Fix:** Add realtime listener on `group_members` (filter by `group_id`) and `group_threads` (filter by `id`) to re-fetch group info.

### 2. Server Settings Dialog — No Realtime at All
**File:** `src/components/server/ServerSettingsDialog.tsx`
- The entire settings dialog and all its sub-tabs (`MembersTab`, `RolesTab`, `EmojisTab`, `StickersTab`, `SoundboardTab`, `ServerProfileTab`, `ServerTagTab`, `EngagementTab`) have **zero** realtime subscriptions.
- **Impact:** If another admin changes server settings, roles, emojis, stickers, or soundboard entries while you have the dialog open, nothing updates.
- **Fix:** This is lower priority since settings dialogs are typically used by one admin at a time, but adding realtime to `MembersTab` (for member joins/leaves/role changes) and `RolesTab` would be most impactful.

### 3. Channel Sidebar — Server Info Updates
**File:** `src/components/server/ChannelSidebar.tsx` (lines 201-227)
- Has realtime on `channels` table but **not on `servers` table**. If the server name, icon, or banner changes, the sidebar header won't update.
- **Impact:** Server name/icon changes require navigating away.
- **Fix:** Add realtime listener on `servers` (filter by `id=serverId`) to update `server` state.

### 4. Channel Sidebar — Soundboard
**File:** `src/components/server/ChannelSidebar.tsx` (lines 170-178)
- Server soundboard sounds are fetched once on voice channel join with no realtime subscription on `server_soundboard`.
- **Impact:** New soundboard clips added by admins won't appear until reconnect.
- **Fix:** Add realtime listener on `server_soundboard` filtered by `server_id`.

### 5. Pinned Messages Drawer — No Realtime
**File:** `src/components/chat/PinnedMessagesDrawer.tsx`
- Pinned messages are fetched only when the drawer opens. No realtime subscription on `messages` for pin/unpin changes.
- **Impact:** If someone pins/unpins a message while the drawer is open, it won't update. Also, the pin count badge in the header won't update.
- **Fix:** Add realtime listener on `messages` (filtered by thread/group/channel) watching for UPDATE events on `is_pinned`.

### 6. AuthContext — Profile Not Realtime-Synced
**File:** `src/contexts/AuthContext.tsx`
- The user's own profile is only fetched on auth state change or manual `refreshProfile()` calls. No realtime subscription on `profiles` for the current user.
- **Impact:** If another device/tab updates your profile (e.g., status expiry, display name), the current session won't reflect it.
- **Fix:** Add a realtime listener on `profiles` filtered by `user_id=eq.${user.id}` to auto-refresh profile state.

### 7. ChatSidebar / HomeSidebar — Pinned Chats Not Realtime
**Files:** `src/components/chat/ChatSidebar.tsx`, `src/components/layout/HomeSidebar.tsx`
- Both sidebars listen for messages, threads, and groups, but **neither listens for `pinned_chats`** changes.
- **Impact:** Pinning/unpinning a chat from the context menu won't reorder the sidebar until you navigate away.
- **Fix:** Add `pinned_chats` to the existing realtime channel subscriptions in both sidebars.

### 8. FriendsDashboard — Profile Updates Not Realtime
**File:** `src/pages/FriendsDashboard.tsx`
- Has realtime on `friendships` table but not on `profiles`. If a friend changes their display name or avatar, it won't update.
- **Impact:** Stale friend display names/avatars until page refresh.
- **Fix:** Lower priority — profiles change infrequently, but could add a profiles listener.

### 9. ServerChannelChat — Member Roles Not Realtime
**File:** `src/components/server/ServerChannelChat.tsx` (lines 434-445)
- Member roles (colors shown next to names) are fetched once on mount with no realtime subscription on `member_roles` or `server_roles`.
- **Impact:** Role color changes by admins won't reflect in the chat until navigation.
- **Fix:** Add realtime listener on `member_roles` and `server_roles` filtered by `server_id`.

---

### Priority Ranking

| Priority | Area | User Impact |
|----------|------|-------------|
| **High** | Group Chat — group info/members | Very visible, frequent changes |
| **High** | Pinned Messages Drawer | Pin/unpin feels broken without it |
| **High** | ChatSidebar/HomeSidebar — pinned_chats | Pin action feels unresponsive |
| **High** | AuthContext — own profile | Status/cosmetics out of sync |
| **Medium** | ChannelSidebar — server info | Server name/icon changes |
| **Medium** | ServerChannelChat — member roles | Role color updates |
| **Medium** | ChannelSidebar — soundboard | New sounds not appearing |
| **Low** | Server Settings Dialog tabs | Admin-only, single-user typical |
| **Low** | FriendsDashboard — profiles | Infrequent profile changes |

### Implementation Approach

Each fix follows the same pattern already used throughout the codebase:
1. Add a `supabase.channel()` subscription with `postgres_changes` on the relevant table(s)
2. On event, either re-fetch the data or optimistically update local state
3. Clean up the subscription in the `useEffect` return

All changes are additive — no existing logic needs to change, just new `useEffect` blocks with realtime subscriptions added to each component.

