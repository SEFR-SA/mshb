

# Ticketing System — Phase 1 & 2 Plan

## Overview

Add a Discord-style ticketing system: a "Support" channel type with a create-ticket button, and auto-generated private "Ticket" channels with open/close controls.

---

## Step 1: Database Migration

**New tables:**

```sql
-- Ticket number sequences per server
CREATE TABLE public.ticket_sequences (
  server_id UUID PRIMARY KEY,
  last_ticket_number INT NOT NULL DEFAULT 0
);
ALTER TABLE public.ticket_sequences ENABLE ROW LEVEL SECURITY;

-- Tickets metadata
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL,
  channel_id UUID NOT NULL,
  owner_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  ticket_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by UUID
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
```

**RLS policies:** Server members can SELECT tickets for their server. No direct INSERT/UPDATE/DELETE from clients (handled by RPCs).

**Channel table additions:**
- `support_role_ids UUID[] DEFAULT '{}'` — stores which server_roles can access tickets created from this support channel.

No new `type` enum needed — the existing `type TEXT` column already accepts any value. We add `'support'` and `'ticket'` as new type values.

---

## Step 2: Database RPCs (SECURITY DEFINER)

**`create_ticket(p_server_id, p_support_channel_id)`:**
1. Verify caller is a server member
2. Check caller has no existing open ticket for this support channel
3. Atomically increment `ticket_sequences` (INSERT ON CONFLICT UPDATE + RETURNING)
4. Get `support_role_ids` from the support channel
5. Create a private channel: name = `ticket-XXXX`, type = `'ticket'`, category = same as support channel, is_private = true
6. Add channel_members: owner + all users who have any of the `support_role_ids`
7. Insert into `tickets` table
8. Insert a system message: "Ticket created by @username"
9. Return the new channel_id and ticket_number

**`close_ticket(p_ticket_id)`:**
1. Verify caller is ticket owner or has a support role
2. Update ticket: status = 'closed', closed_at = now(), closed_by = auth.uid()
3. Rename channel to `closed-XXXX`
4. Remove owner from channel_members (makes it read-only for them)
5. Insert system message: "Ticket closed by @username"

**`reopen_ticket(p_ticket_id)`:** (stub for Phase 3, but we'll create the RPC signature)

---

## Step 3: Channel Creation UI Updates (ChannelSidebar.tsx)

- Add `'support'` to the channel type Select dropdown (alongside text/voice)
- When `support` is selected, show a **role picker** to select which server_roles are the support team (`support_role_ids`)
- Hide announcement/rules toggles when type is `support`
- Pass `support_role_ids` in the channel insert
- Render support channels with a `LifeBuoy` icon (from lucide-react)
- Ticket channels (`type === 'ticket'`) render with a `Ticket` icon

---

## Step 4: Support Channel View (new SupportChannelView.tsx)

When `activeChannel.type === 'support'`:
- Render a centered embed card instead of the chat feed
- Title: "Support Tickets" with LifeBuoy icon
- Description text explaining ticket creation
- Green "Create Ticket" button with `Mail` icon
- On click: call `create_ticket` RPC
- On success: show ephemeral toast "Ticket Created: #ticket-XXXX" with a link to navigate to the new channel
- On error (already has open ticket): show error toast

---

## Step 5: Ticket Channel Controls (ServerChannelChat.tsx)

When channel type is `'ticket'`:
- Fetch the ticket record from `tickets` table
- At the top of the message feed, render a **Ticket Controls** card:
  - **If status = 'open'**: Red "Close" button with Lock icon. Clicking opens AlertDialog confirmation. On confirm → call `close_ticket` RPC.
  - **If status = 'closed'**: Hide chat input entirely. Show three buttons: "Reopen" (Unlock), "Transcript" (FileText), "Delete" (Trash2) — UI-only for now, Phase 3 backend.

---

## Step 6: ServerView.tsx Routing

- Update `activeChannel` type to include `type: string` values `'support'` and `'ticket'`
- In `renderMainContent()`: if `activeChannel.type === 'support'`, render `<SupportChannelView>` instead of `<ServerChannelChat>`
- Pass ticket-related props through for ticket channels

---

## Step 7: Translations (en.ts + ar.ts)

Add keys under `channels` and new `tickets` namespace:
- `channels.support`, `channels.supportDesc`, `channels.selectSupportRoles`
- `tickets.title`, `tickets.description`, `tickets.createButton`, `tickets.created`, `tickets.closeConfirmTitle`, `tickets.closeConfirmDesc`, `tickets.closedBy`, `tickets.reopen`, `tickets.transcript`, `tickets.delete`, `tickets.alreadyOpen`

---

## Files Modified/Created

1. **Migration SQL** — new tables, RLS, RPCs, column addition
2. `src/components/server/ChannelSidebar.tsx` — support type in creation, icon rendering
3. `src/components/server/SupportChannelView.tsx` — **new file**, embed card UI
4. `src/components/server/ServerChannelChat.tsx` — ticket controls card, closed state
5. `src/pages/ServerView.tsx` — routing for support/ticket channel types
6. `src/i18n/en.ts` + `src/i18n/ar.ts` — translation keys

