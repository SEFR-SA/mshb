

# Phase 3: Transcripts, Reopen, Delete, Auto-Delete & Realtime

## Current State
- `tickets` table exists with: `id, server_id, channel_id, owner_id, support_channel_id, ticket_number, status, created_at, closed_at, closed_by`. No `transcript_url` column.
- Closed ticket UI has three disabled buttons: Reopen, Transcript, Delete.
- `reopen_ticket` RPC exists as a stub (`RAISE EXCEPTION 'Not implemented yet'`).
- No realtime subscription on `tickets` table.

---

## Step 1: Database Migration

Single migration covering all schema changes:

```sql
-- Add transcript_url to tickets
ALTER TABLE public.tickets ADD COLUMN transcript_url TEXT;

-- Create storage bucket for transcripts
INSERT INTO storage.buckets (id, name, public) VALUES ('ticket_transcripts', 'ticket_transcripts', true);

-- Storage RLS: anyone can read, only service role inserts (edge function uses service role)
CREATE POLICY "Public read transcripts" ON storage.objects FOR SELECT USING (bucket_id = 'ticket_transcripts');

-- Enable realtime for tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

-- Replace reopen_ticket stub with real implementation
CREATE OR REPLACE FUNCTION public.reopen_ticket(p_ticket_id UUID) ...
  -- Set status='open', clear closed_at/closed_by
  -- Rename channel back to ticket-XXXX
  -- Re-add owner to channel_members
  -- Insert system message "Ticket reopened by @user"

-- New delete_ticket RPC
CREATE OR REPLACE FUNCTION public.delete_ticket(p_ticket_id UUID) ...
  -- Verify caller is owner or support role or admin
  -- Delete channel (cascades messages via FK or manual delete)
  -- Delete ticket record

-- Cron job: hourly cleanup of tickets closed >24h
SELECT cron.schedule('cleanup-closed-tickets', '0 * * * *', $$
  DELETE FROM public.channels WHERE id IN (
    SELECT channel_id FROM public.tickets
    WHERE status = 'closed' AND closed_at < now() - interval '24 hours'
  );
  DELETE FROM public.tickets
  WHERE status = 'closed' AND closed_at < now() - interval '24 hours';
$$);
```

## Step 2: Edge Function — `generate-transcript`

New file: `supabase/functions/generate-transcript/index.ts`

- Accepts `{ ticket_id }` in POST body
- Auth: validates JWT via `getClaims()`, verifies caller is server member
- Fetches ticket record, checks if `transcript_url` already exists (return it if so)
- Fetches all messages for that channel_id, joined with profiles for author names
- Formats as HTML: timestamp, author, content per message
- Uploads to `ticket_transcripts/{server_id}/{ticket_id}.html`
- Updates `tickets.transcript_url` with the public URL
- Returns the URL

Config addition in `supabase/config.toml`:
```toml
[functions.generate-transcript]
verify_jwt = false
```

## Step 3: UI Updates — `ServerChannelChat.tsx`

Wire up the three closed-state buttons:

**Reopen**: Call `supabase.rpc("reopen_ticket", { p_ticket_id })`. On success, update local state.

**Transcript**: Call `supabase.functions.invoke("generate-transcript", { body: { ticket_id } })`. Show loading spinner on button. On success, `window.open(url, "_blank")`.

**Delete**: Open AlertDialog confirmation. On confirm, call `supabase.rpc("delete_ticket", { p_ticket_id })`. On success, navigate back to the server's first channel.

**Realtime subscription**: Add a `useEffect` subscribing to `postgres_changes` on the `tickets` table filtered by `channel_id=eq.${channelId}`. On UPDATE events, sync `ticketInfo` state so close/reopen actions from other users are reflected instantly.

## Step 4: Translations

Add keys to `en.ts` and `ar.ts`:
- `tickets.reopenConfirm`, `tickets.reopenSuccess`, `tickets.deleteConfirmTitle`, `tickets.deleteConfirmDesc`, `tickets.deleteSuccess`, `tickets.generatingTranscript`, `tickets.transcriptReady`

---

## Files Modified/Created

1. **Migration SQL** — `transcript_url` column, storage bucket, reopen/delete RPCs, cron job, realtime
2. `supabase/functions/generate-transcript/index.ts` — new edge function
3. `supabase/config.toml` — add generate-transcript entry
4. `src/components/server/ServerChannelChat.tsx` — wire buttons + realtime subscription
5. `src/i18n/en.ts` + `src/i18n/ar.ts` — new translation keys

