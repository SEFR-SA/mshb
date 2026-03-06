

## Notification Event Triggers — Implementation Plan

### Phase 1: Server Mentions (Database Trigger)

**SQL trigger on `messages` table, `AFTER INSERT` where `channel_id IS NOT NULL`.**

The trigger function will:
1. Check if `NEW.channel_id` is not null (server message only)
2. Look up the `server_id` from `channels` table
3. If `content` contains `@all`, insert a notification for every `server_members` row (excluding `NEW.author_id`)
4. Otherwise, scan for `@username` patterns using `regexp_matches`, look up each username in `profiles`, and insert a notification for that user (if they are a server member)
5. Payload: `type = 'mention'`, `actor_id = NEW.author_id`, `entity_id = NEW.id`, `user_id = matched user`

```sql
CREATE OR REPLACE FUNCTION public.notify_on_mention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_server_id uuid;
  v_mention text;
  v_target_uid uuid;
BEGIN
  IF NEW.channel_id IS NULL THEN RETURN NEW; END IF;

  SELECT server_id INTO v_server_id FROM channels WHERE id = NEW.channel_id;
  IF v_server_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.content ILIKE '%@all%' THEN
    INSERT INTO notifications (user_id, actor_id, type, entity_id)
    SELECT sm.user_id, NEW.author_id, 'mention', NEW.id
    FROM server_members sm
    WHERE sm.server_id = v_server_id AND sm.user_id <> NEW.author_id;
  ELSE
    FOR v_mention IN SELECT (regexp_matches(NEW.content, '@(\w+)', 'g'))[1] LOOP
      SELECT p.user_id INTO v_target_uid
      FROM profiles p
      JOIN server_members sm ON sm.user_id = p.user_id AND sm.server_id = v_server_id
      WHERE p.username = v_mention
      LIMIT 1;

      IF v_target_uid IS NOT NULL AND v_target_uid <> NEW.author_id THEN
        INSERT INTO notifications (user_id, actor_id, type, entity_id)
        VALUES (v_target_uid, NEW.author_id, 'mention', NEW.id);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_mention
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_mention();
```

**Key detail:** The trigger uses `SECURITY DEFINER` to bypass RLS (since the INSERT policy on `notifications` requires `auth.uid() = actor_id`, which doesn't exist in a trigger context). This is correct and safe — the trigger runs server-side with validated data.

---

### Phase 2: Missed Calls (Frontend Wiring)

**Location:** `src/components/chat/CallListener.tsx`

Two insertion points for missed call notifications:

1. **Callee timeout** (line ~166): When the 3-minute timeout fires and the callee didn't answer, the callee's client sets status to `"missed"`. At this point, insert a notification for the callee (`user_id = user.id`, `actor_id = session.caller_id`, `type = 'missed_call'`).

2. **Caller sees "missed" status** (line ~207): The caller's realtime watcher detects `status === "missed"`. No notification needed here — the callee already inserted it.

So only one insert is needed — in the callee's timeout handler.

---

### Phase 3: Kicks & Streams (Frontend Wiring)

**Kicks** — `src/components/server/ServerMemberContextMenu.tsx`, `handleKick` function (line 159):
- After the audit log insert, add: `supabase.from("notifications").insert({ user_id: targetUserId, actor_id: user.id, type: 'server_kick', entity_id: serverId })`

**Streams** — `src/components/server/VoiceConnectionBar.tsx`, after `is_screen_sharing: true` DB update (line ~436):
- Fetch all server members for the current voice channel's server, then batch-insert notifications for each member (excluding self): `type = 'stream_start'`, `actor_id = user.id`, `entity_id = serverId`
- To get the server_id, use the `voiceChannel` context which already has the server_id available.

---

### Phase 4: UI Formatting (NotificationCenter.tsx)

Updates to `NotificationCenter.tsx`:
- Change timestamp from relative (`formatDistanceToNow`) to absolute date+time format using `format(date, "MMM d, yyyy 'at' h:mm a")` from date-fns
- Add `server_kick` and `stream_start` cases to `getNotificationText`:
  - `server_kick`: "You were kicked from a server" (entity_id is server_id but we'd need a join to get the name — will add server name fetch to the query)
  - `stream_start`: "{{name}} started a stream"

Updates to `useNotifications.ts`:
- The query already joins `profiles` on `actor_id`. For `server_kick` and `stream_start` where `entity_id` references a server, we can't easily do a polymorphic join in one query. Instead, for these types, we'll fetch the server name inline in the component (or simply show "a server" in the text — simpler and avoids complex joins).

Translation keys to add (both `en.ts` and `ar.ts`):
- `notificationCenter.serverKick`: "You were kicked from a server"
- `notificationCenter.streamStart`: "{{name}} started a stream"

---

### Additional Notification Types — Proposals

Here are 5 additional notification types worth implementing in the future:

| Type | Trigger | Description |
|------|---------|-------------|
| `friend_request` | Frontend: `friendships` INSERT | "{{name}} sent you a friend request" — wire into existing friend request logic (e.g., `FriendsDashboard.tsx`, `ServerMemberContextMenu.tsx` `handleAddFriend`) |
| `friend_accepted` | Frontend: `friendships` UPDATE to `accepted` | "{{name}} accepted your friend request" |
| `server_join` | DB trigger on `server_members` INSERT | "{{name}} joined your server" — notify server owner only |
| `group_invite` | Frontend: group member add logic | "{{name}} added you to a group" |
| `dm_message` | DB trigger on `messages` where `thread_id IS NOT NULL` | "{{name}} sent you a message" — useful for mobile push notifications later |

I recommend implementing `friend_request` and `friend_accepted` first since the code paths are simple and well-defined.

---

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | New trigger function + trigger on `messages` |
| `src/components/chat/CallListener.tsx` | Insert missed_call notification in timeout handler |
| `src/components/server/ServerMemberContextMenu.tsx` | Insert server_kick notification in handleKick |
| `src/components/server/VoiceConnectionBar.tsx` | Insert stream_start notifications on screen share start |
| `src/components/NotificationCenter.tsx` | Update timestamp format, add new type cases |
| `src/hooks/useNotifications.ts` | No changes needed (query already works) |
| `src/i18n/en.ts` + `ar.ts` | Add serverKick + streamStart translation keys |

