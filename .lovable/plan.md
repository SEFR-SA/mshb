

## Server Activity Indicators

### What This Does
Adds two Discord-style indicators to the Server Rail and Channel Sidebar:

1. **Voice/Screen Share indicator on server icons**: A small icon appears below/beside each server avatar in the rail showing activity -- a screen share icon (monitor) when someone is sharing their screen in a voice channel, or a speaker icon when users are in a voice channel but not screen sharing.

2. **Unread message dot on server icons**: A white dot appears on the left edge of server icons in the rail when there are unread messages in any text channel. The same dot also appears next to individual text channels in the Channel Sidebar.

---

### Changes

#### 1. Database: New `channel_read_status` table

Create a new table to track when each user last read each server text channel:

- `id` (uuid, primary key)
- `channel_id` (uuid, references channels)
- `user_id` (uuid)
- `last_read_at` (timestamptz)
- Unique constraint on (channel_id, user_id)
- RLS policies: users can read/upsert their own rows

Also add an `is_screen_sharing` boolean column to `voice_channel_participants` so the server rail can query who is screen sharing without relying on signaling events.

#### 2. Database: Enable realtime for `channel_read_status`

So unread indicators update live when users read channels or new messages arrive.

#### 3. Server Rail -- Voice/Screen Share Indicator

**`src/components/server/ServerRail.tsx`**

- For each server, query `voice_channel_participants` joined with `channels` to check if anyone is in a voice channel for that server.
- If any participant has `is_screen_sharing = true`, show a small screen share icon (Monitor) on the server avatar.
- Otherwise, if any participants exist, show a speaker icon (Volume2).
- Subscribe to realtime changes on `voice_channel_participants` to keep indicators live.
- The indicator is rendered as a small icon badge at the bottom-right of the server avatar.

#### 4. Server Rail -- Unread Message Dot

**`src/components/server/ServerRail.tsx`**

- For each server, query `messages` where `channel_id` is in that server's channels, and `created_at` is after the user's `last_read_at` from `channel_read_status`, and `author_id != current user`.
- If count > 0, show a small white dot on the start (left in LTR) edge of the server icon.
- Subscribe to realtime on `messages` (channel_id-based) and `channel_read_status` for live updates.
- Create a custom hook `useServerUnread` to encapsulate this logic.

#### 5. Channel Sidebar -- Unread Dot on Text Channels

**`src/components/server/ChannelSidebar.tsx`**

- Track which text channels have unread messages using the same `channel_read_status` table.
- Show a small white dot next to unread channel names (or bold the channel name, Discord-style).
- When a user navigates to a channel, upsert `channel_read_status` with the current timestamp to mark it as read.

#### 6. Mark Channel as Read

**`src/components/server/ServerChannelChat.tsx`**

- When the component mounts or when the user views a channel, upsert `channel_read_status` with `last_read_at = now()`.
- This clears the unread indicator for that channel.

#### 7. VoiceConnectionBar -- Update `is_screen_sharing` in DB

**`src/components/server/VoiceConnectionBar.tsx`**

- When screen sharing starts, update `voice_channel_participants` to set `is_screen_sharing = true` for the current user.
- When screen sharing stops, set it back to `false`.
- This allows the Server Rail to query screen share state from the database.

#### 8. Translations

**`src/i18n/en.ts`** and **`src/i18n/ar.ts`**

- No new visible text needed (indicators are icon-only).

---

### Technical Details

**Unread detection query pattern** (per server):
```text
-- Get unread count for all channels in a server
SELECT c.id 
FROM channels c
LEFT JOIN channel_read_status crs 
  ON crs.channel_id = c.id AND crs.user_id = :userId
WHERE c.server_id = :serverId 
  AND c.type = 'text'
  AND EXISTS (
    SELECT 1 FROM messages m 
    WHERE m.channel_id = c.id 
      AND m.author_id != :userId
      AND (crs.last_read_at IS NULL OR m.created_at > crs.last_read_at)
  )
```

**Voice activity indicator logic**:
```text
For each server:
  1. Query voice_channel_participants JOIN channels WHERE server_id = serverId
  2. If any row has is_screen_sharing = true -> show Monitor icon
  3. Else if any rows exist -> show Volume2 icon  
  4. Else -> show nothing
```

**White unread dot styling** (on server rail):
```text
<div className="absolute -start-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full" />
```

**Marking as read** (in ServerChannelChat on mount):
```text
await supabase.from("channel_read_status")
  .upsert({ channel_id, user_id, last_read_at: new Date().toISOString() }, 
    { onConflict: "channel_id,user_id" });
```

### New Hook

**`src/hooks/useServerUnread.ts`** -- encapsulates the unread logic for all servers, returns a `Map<serverId, boolean>` indicating which servers have unread messages. Subscribes to realtime for live updates.

### Files Modified
- **New migration**: create `channel_read_status` table, add `is_screen_sharing` column to `voice_channel_participants`
- **New**: `src/hooks/useServerUnread.ts` -- unread detection hook
- `src/components/server/ServerRail.tsx` -- add voice activity indicator + unread dot
- `src/components/server/ChannelSidebar.tsx` -- add unread dot per channel
- `src/components/server/ServerChannelChat.tsx` -- mark channel as read on view
- `src/components/server/VoiceConnectionBar.tsx` -- update `is_screen_sharing` in DB
