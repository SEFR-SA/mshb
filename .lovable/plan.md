

## Plan: Per-Channel Notification Overrides

### Problem
Users can set server-level notification preferences but cannot customize notifications for individual channels within a server.

### Changes

#### 1. Database: Create `channel_notification_prefs` table

```sql
CREATE TABLE public.channel_notification_prefs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL,
  level text NOT NULL DEFAULT 'all_messages',
  PRIMARY KEY (user_id, channel_id)
);

ALTER TABLE public.channel_notification_prefs ENABLE ROW LEVEL SECURITY;

-- Standard user-own-data RLS policies (SELECT, INSERT, UPDATE, DELETE)
```

Values: `all_messages`, `only_mentions`, `nothing`.

#### 2. New hook: `src/hooks/useChannelNotificationPref.ts`
Mirror the pattern from `useServerNotificationPref.ts`:
- Single-channel fetch + `setLevel` with upsert
- Batch-fetch variant for multiple channels (used in sidebar)

#### 3. UI: Add notification option to channel dropdown in `ChannelSidebar.tsx`

Currently the admin dropdown (line ~572) only shows Edit/Manage Members/Delete for admins. We need a notification submenu available to **all users** (not just admins).

Approach:
- Add a `DropdownMenuSub` with Bell icon + "Notifications" label containing three `DropdownMenuCheckboxItem` options (All Messages, Only @mentions, Nothing) inside `renderAdminDropdown` — but also render a separate simpler dropdown for non-admins that only contains the notification option.
- Refactor: rename `renderAdminDropdown` to `renderChannelDropdown` and always show the notification sub-menu, conditionally show admin items.

#### 4. Update `GlobalNotificationListener.tsx`

After resolving server-level pref (line ~67), also check `channel_notification_prefs` for the specific channel. Channel-level pref takes priority over server-level pref:

```
channel pref → server pref → server default → "all_messages"
```

#### 5. i18n updates
Add keys in `en.ts` and `ar.ts`:
- `channels.notifications` — "Notifications"
- `channels.allMessages` — "All Messages"
- `channels.onlyMentions` — "Only @mentions"
- `channels.nothing` — "Nothing"

### Priority Chain
Channel override > Server override > Server default > "all_messages"

