

## Plan: Per-User Server Notification Preferences

### Problem
Currently, server notification level is a server-wide setting (`servers.default_notification_level`). Users cannot individually override their notification preference for a specific server. The user wants a "Server Notifications" submenu in the server right-click context menu with three options: All Messages, Only @mentions, Nothing.

### Changes

#### 1. Database: Create `server_notification_prefs` table
New table to store per-user per-server notification preferences.

```sql
CREATE TABLE public.server_notification_prefs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id uuid NOT NULL,
  level text NOT NULL DEFAULT 'all_messages',
  PRIMARY KEY (user_id, server_id)
);

ALTER TABLE public.server_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prefs" ON public.server_notification_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own prefs" ON public.server_notification_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prefs" ON public.server_notification_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prefs" ON public.server_notification_prefs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
```

Values for `level`: `all_messages`, `only_mentions`, `nothing`.

#### 2. `src/hooks/useServerNotificationPref.ts` (new file)
Custom hook that:
- Fetches the user's notification pref for a given server from `server_notification_prefs`
- Falls back to the server's `default_notification_level` if no row exists
- Provides a `setLevel` function that upserts the preference
- Exposes the current `level` value

#### 3. `src/components/server/ServerRail.tsx`
- Add "Server Notifications" submenu after the "Server Settings" submenu (before the separator before Leave/Delete)
- Uses `ContextMenuSub` > `ContextMenuSubTrigger` (Bell icon + "Server Notifications") > `ContextMenuSubContent` with three `ContextMenuCheckboxItem` entries:
  - All Messages (`all_messages`)
  - Only @mentions (`only_mentions`) 
  - Nothing (`nothing`)
- Each item shows a checkmark when active
- Track per-server pref state using a local map loaded on mount, updated on click via upsert
- Also add the same options to the mobile long-press bottom sheet

#### 4. `src/components/chat/GlobalNotificationListener.tsx`
- After fetching `channelData.servers.default_notification_level`, also fetch the user's override from `server_notification_prefs` for that server
- Use user pref if it exists, otherwise fall back to server default
- When level is `nothing`, skip all notifications entirely

#### 5. i18n: `src/i18n/en.ts` and `src/i18n/ar.ts`
Add keys:
- `servers.serverNotifications` — "Server Notifications"
- `servers.allMessages` — "All Messages"
- `servers.onlyMentions` — "Only @mentions"  
- `servers.nothing` — "Nothing"

### Flow
1. User right-clicks server → sees "Server Notifications" submenu with radio-style items
2. Selecting an option upserts into `server_notification_prefs`
3. When a new message arrives, `GlobalNotificationListener` checks user's per-server pref first, then server default
4. `nothing` = no sound, no desktop notification, no toast; `only_mentions` = only when @mentioned; `all_messages` = all

