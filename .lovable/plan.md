

# Bug Fix Plan: Ticketing System — 3 Critical Fixes

## Bug 1: Server Owner Access to Tickets

**Root cause**: `create_ticket` RPC only adds the ticket owner and users with support roles to `channel_members`. The server owner is not included.

**Fix**: Update the `create_ticket` RPC via migration. After inserting channel members for support roles, fetch `owner_id` from the `servers` table and insert them into `channel_members` (with `ON CONFLICT DO NOTHING` in case the owner already has a support role).

```sql
-- Add after the support role member loop:
INSERT INTO public.channel_members (channel_id, user_id)
SELECT v_channel_id, s.owner_id FROM public.servers s WHERE s.id = p_server_id
ON CONFLICT DO NOTHING;
```

---

## Bug 2: Private Channels Visible in Sidebar

**Root cause**: The `channels` SELECT RLS policy only checks `is_server_member()` — it does not filter private channels by `channel_members` membership.

**Fix**: Replace the existing SELECT policy on `channels` with a stricter one:

```sql
DROP POLICY "Members can view channels" ON public.channels;
CREATE POLICY "Members can view channels" ON public.channels
FOR SELECT USING (
  is_server_member(auth.uid(), server_id)
  AND (
    is_private = false
    OR is_server_admin(auth.uid(), server_id)
    OR is_channel_member(auth.uid(), id)
  )
);
```

This means private channels (including tickets) are only visible to admins/owners or explicit channel members. No frontend changes needed — the query in `ChannelSidebar.tsx` already fetches all channels; RLS will now correctly filter.

---

## Bug 3: System Message Formatting

**Backend fix**: Update all three RPCs (`create_ticket`, `close_ticket`, `reopen_ticket`) to use `display_name` instead of `username` for friendlier text, and set `type = 'system'` on the inserted message (the `type` column already exists on `messages`).

```sql
-- In each RPC, change:
SELECT p.username INTO v_username ...
-- To:
SELECT COALESCE(p.display_name, p.username) INTO v_display_name ...

-- And insert with type = 'system':
INSERT INTO public.messages (channel_id, author_id, content, type)
VALUES (v_channel_id, v_user_id, 'Ticket created by ' || v_display_name, 'system');
```

**Frontend fix**: In `ServerChannelChat.tsx`, the `MessageItem` component already handles special message types (`welcome`, `boost`). Add a handler for `type === 'system'`:

- Render centered, muted text with a divider line pattern (matching the existing `welcome` style)
- Use an `Info` icon instead of an emoji
- Skip author avatar/name rendering entirely

---

## Files Modified

1. **Migration SQL** — Updated `create_ticket`, `close_ticket`, `reopen_ticket` RPCs + replaced `channels` SELECT RLS policy
2. `src/components/server/ServerChannelChat.tsx` — Add system message rendering in `MessageItem`

## No Breaking Changes
- Existing channels unaffected (non-private channels still visible to all members)
- Existing messages with `type = 'system'` will render with the new style

