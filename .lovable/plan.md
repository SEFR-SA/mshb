

## Add Private/Public Channel Support

### Overview
Add the ability to create channels as private or public. Private channels restrict access to selected server members only. Non-allowed members see a lock icon and a "This channel is private" message instead of the channel content.

### Database Changes

**1. Add `is_private` column to `channels` table**
```sql
ALTER TABLE public.channels ADD COLUMN is_private boolean NOT NULL DEFAULT false;
```

**2. Create `channel_members` table** for tracking who has access to private channels
```sql
CREATE TABLE public.channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
```

**3. Create a `is_channel_member` security definer function** to avoid RLS recursion
```sql
CREATE OR REPLACE FUNCTION public.is_channel_member(_user_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE user_id = _user_id AND channel_id = _channel_id
  )
$$;
```

**4. Create a helper function** to check if a channel is private
```sql
CREATE OR REPLACE FUNCTION public.is_channel_private(_channel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_private FROM public.channels WHERE id = _channel_id),
    false
  )
$$;
```

**5. RLS policies for `channel_members`**
- SELECT: server members can view channel members (need to know who's in the channel)
- INSERT: server admins only
- DELETE: server admins only

**6. Update `channels` SELECT RLS policy** to account for private channels:
- Public channels: visible to all server members (existing behavior)
- Private channels: visible only to channel members (show in sidebar with lock icon, but content blocked)
- Actually, we want ALL channels visible in the sidebar (so users see the lock icon). The content restriction happens at the message level and in the UI.

So the `channels` SELECT policy stays as-is (all server members see all channels). The restriction is enforced:
- On `messages` -- update the existing SELECT/INSERT policies to also check channel membership for private channels
- In the UI -- show lock icon and block content for non-members

**7. Update `messages` RLS policies** for channel messages to check private channel access:
- Current policy for channel messages: `is_server_member(auth.uid(), channels.server_id)`
- New logic: `is_server_member(...) AND (NOT is_channel_private(channel_id) OR is_channel_member(auth.uid(), channel_id))`

### Frontend Changes

**`src/components/server/ChannelSidebar.tsx`**
- Add `is_private` to the Channel interface
- Add state for the create dialog: `isPrivate` toggle (Switch), and `selectedMembers` (array of user IDs)
- When `isPrivate` is toggled on, show a member selection list (checkboxes with server member avatars/names)
- Fetch server members when private is toggled on
- On create: insert the channel, then if private, insert rows into `channel_members` for selected users (plus the creator automatically)
- In the channel list: show a Lock icon instead of Hash for private channels
- For voice channels that are private: show Lock icon as well

**`src/components/server/ServerChannelChat.tsx`**
- Accept an `isPrivate` and `hasAccess` prop
- If `isPrivate && !hasAccess`, show a locked state: lock icon + "This channel is private" message instead of the chat
- Otherwise render normally

**`src/pages/ServerView.tsx`**
- When loading the active channel, also fetch its `is_private` flag
- Check if the current user is in `channel_members` for private channels
- Pass `isPrivate` and `hasAccess` to `ServerChannelChat`

**`src/i18n/en.ts` and `src/i18n/ar.ts`**
- Add keys: `channels.private`, `channels.public`, `channels.privateDesc`, `channels.selectMembers`, `channels.privateChannel`, `channels.noAccess`

### Files Summary

| File | Action | Changes |
|------|--------|---------|
| Database migration | Create | Add `is_private` column, `channel_members` table, helper functions, RLS policies |
| `src/components/server/ChannelSidebar.tsx` | Modify | Private toggle + member selection in create dialog; lock icon for private channels |
| `src/components/server/ServerChannelChat.tsx` | Modify | Show locked state when user lacks access |
| `src/pages/ServerView.tsx` | Modify | Check channel privacy and user access |
| `src/i18n/en.ts` | Modify | Add private channel translation keys |
| `src/i18n/ar.ts` | Modify | Add Arabic translations |

### How It Works

1. Admin creates a channel and toggles "Private" on
2. A member picker appears showing all server members with checkboxes
3. Admin selects who can access the channel, then creates it
4. The channel appears in the sidebar for ALL members, but with a lock icon for private ones
5. Members without access see a "This channel is private" message with a lock icon when they click it
6. Members with access see and use the channel normally
7. RLS on messages ensures non-members physically cannot read/write messages in private channels

