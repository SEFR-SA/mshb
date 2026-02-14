

## Implement Discord-Style Server (Guild) Architecture

This is a major feature that adds a full server/guild system to Galaxy Chat, inspired by Discord's layout. It involves database schema changes, new tables, RLS policies, and significant frontend UI work.

### Phase 1: Database Schema

Create three new tables and update the messages table:

**New Tables:**

1. **`servers`** -- The guild/server entity
   - `id` (uuid, PK, default gen_random_uuid())
   - `name` (text, not null)
   - `icon_url` (text, nullable)
   - `owner_id` (uuid, not null) -- references the creator
   - `invite_code` (text, unique, not null) -- random 8-char code for invites
   - `created_at` (timestamptz, default now())

2. **`channels`** -- Text/voice channels within a server
   - `id` (uuid, PK, default gen_random_uuid())
   - `server_id` (uuid, not null, FK to servers.id ON DELETE CASCADE)
   - `name` (text, not null)
   - `type` (text, not null, default 'text') -- 'text' or 'voice'
   - `category` (text, default 'general') -- grouping label
   - `position` (integer, default 0) -- ordering
   - `created_at` (timestamptz, default now())

3. **`server_members`** -- Many-to-many users-to-servers
   - `id` (uuid, PK, default gen_random_uuid())
   - `server_id` (uuid, not null, FK to servers.id ON DELETE CASCADE)
   - `user_id` (uuid, not null)
   - `role` (text, not null, default 'member') -- 'owner', 'admin', 'member'
   - `joined_at` (timestamptz, default now())
   - UNIQUE(server_id, user_id)

**Updated Table:**

4. **`messages`** -- Add a `channel_id` column
   - `channel_id` (uuid, nullable, FK to channels.id ON DELETE CASCADE)

**Helper Functions (SECURITY DEFINER):**
- `is_server_member(uuid, uuid)` -- checks if user is in a server
- `is_server_admin(uuid, uuid)` -- checks if user is owner or admin
- `generate_invite_code()` -- generates a random 8-char alphanumeric code

**RLS Policies:**
- `servers`: Members can SELECT; owner can INSERT (with check); owner/admin can UPDATE; no DELETE
- `channels`: Server members can SELECT; admin/owner can INSERT, UPDATE, DELETE
- `server_members`: Server members can SELECT themselves; admin/owner can INSERT/DELETE; self can DELETE (leave)
- `messages`: Existing policies extended -- if `channel_id` is set, check server membership via the channel's server_id

**Realtime:** Enable realtime for `channels` and `server_members` tables.

### Phase 2: Frontend -- New Components

**New Files to Create:**

| File | Purpose |
|------|---------|
| `src/pages/ServerView.tsx` | Main server page: channel sidebar + chat area + member list |
| `src/components/server/ServerRail.tsx` | Leftmost vertical rail of circular server icons + "+" button |
| `src/components/server/ChannelSidebar.tsx` | Channel list grouped by category (Text Channels / Voice Channels) |
| `src/components/server/ServerMemberList.tsx` | Right panel showing members grouped by role |
| `src/components/server/CreateServerDialog.tsx` | Modal for creating a new server (name input) |
| `src/components/server/ServerChannelChat.tsx` | Chat view for a specific channel (reuses message patterns from Chat.tsx) |
| `src/components/server/JoinServerDialog.tsx` | Modal for joining via invite code |

### Phase 3: Frontend -- Layout Changes

**`src/components/layout/AppLayout.tsx`** -- Add a server icon in the nav (e.g., a "Servers" nav item or integrate the ServerRail as a persistent left rail).

**`src/App.tsx`** -- Add new routes:
- `/server/:serverId` -- Server view (defaults to first text channel)
- `/server/:serverId/channel/:channelId` -- Specific channel view

**Desktop Layout (inside ServerView):**

```text
+--------+------------------+---------------------+-----------------+
| Server | Channel Sidebar  |   Channel Chat      | Member List     |
| Rail   | (server name,    |   (messages for      | (grouped by     |
| (icons)| channel groups)  |   selected channel)  | role/status)    |
| ~56px  | ~220px           |   flex-1             | ~220px          |
+--------+------------------+---------------------+-----------------+
```

**Mobile Layout:** Single-column with a drawer/sheet for the channel sidebar, collapsing the member list.

### Phase 4: Server Creation Flow

When a user creates a server:
1. Insert into `servers` (name, owner_id, generated invite_code)
2. Insert into `server_members` (server_id, user_id, role='owner')
3. Insert a default channel: `#general` (type='text', category='Text Channels')
4. Navigate to `/server/{new_server_id}`

### Phase 5: Channel Switching and Real-time Messaging

- Clicking a text channel navigates to `/server/:serverId/channel/:channelId`
- `ServerChannelChat` fetches messages where `channel_id = channelId`
- Real-time subscription filters on `channel_id=eq.{channelId}` so only messages for the active channel appear
- Sending a message inserts with `channel_id` set (no `thread_id` or `group_thread_id`)

### Phase 6: i18n Updates

Add translation keys to `src/i18n/en.ts` and `src/i18n/ar.ts`:
- `servers.create`, `servers.name`, `servers.invite`, `servers.joinServer`, `servers.members`, `servers.leave`, `servers.settings`, `servers.inviteCode`, `servers.copyInvite`
- `channels.text`, `channels.voice`, `channels.create`, `channels.name`, `channels.category`
- Role labels: `servers.owner`, `servers.admin`, `servers.member`

### Technical Details

**SQL Migration (summary):**

```sql
-- servers table
CREATE TABLE public.servers ( ... );
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- channels table
CREATE TABLE public.channels ( ... );
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- server_members table
CREATE TABLE public.server_members ( ... );
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

-- Add channel_id to messages
ALTER TABLE public.messages ADD COLUMN channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE;

-- Helper functions
CREATE FUNCTION public.is_server_member(...) ...
CREATE FUNCTION public.is_server_admin(...) ...
CREATE FUNCTION public.generate_invite_code() ...

-- RLS policies for all new tables
-- Update messages RLS to include channel_id path

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_members;
```

**Messages RLS update:** The existing SELECT policy on messages checks `thread_id` or `group_thread_id`. We need to add a third OR branch:
```sql
OR (channel_id IS NOT NULL AND is_server_member(auth.uid(), (SELECT server_id FROM channels WHERE id = messages.channel_id)))
```

Similarly for INSERT.

**Files Modified:**

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/server/:serverId` and `/server/:serverId/channel/:channelId` routes |
| `src/components/layout/AppLayout.tsx` | Add ServerRail as leftmost column; add "Servers" nav item for mobile |
| `src/i18n/en.ts` | Add server/channel translation keys |
| `src/i18n/ar.ts` | Add Arabic server/channel translation keys |

**Files Created:**

| File | Purpose |
|------|---------|
| `src/pages/ServerView.tsx` | Server layout orchestrator |
| `src/components/server/ServerRail.tsx` | Vertical server icon list |
| `src/components/server/ChannelSidebar.tsx` | Channel list with categories |
| `src/components/server/ServerMemberList.tsx` | Right-side member panel |
| `src/components/server/CreateServerDialog.tsx` | Create server modal |
| `src/components/server/JoinServerDialog.tsx` | Join via invite code modal |
| `src/components/server/ServerChannelChat.tsx` | Channel message view |

### Implementation Order

1. Run database migration (tables, functions, RLS, realtime)
2. Create all server components
3. Update AppLayout with ServerRail
4. Add routes in App.tsx
5. Update i18n files
6. Test end-to-end

