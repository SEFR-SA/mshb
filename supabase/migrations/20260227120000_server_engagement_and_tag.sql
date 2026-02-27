-- Phase 2: Server Engagement & Tag columns
-- Adds engagement settings and server tag fields to the servers table.
-- No new RLS policies needed — existing owner/admin UPDATE policy covers all columns.

-- Engagement columns
ALTER TABLE public.servers
  ADD COLUMN welcome_message_enabled    boolean  NOT NULL DEFAULT false,
  ADD COLUMN system_message_channel_id  uuid     REFERENCES public.channels(id) ON DELETE SET NULL,
  ADD COLUMN default_notification_level text     NOT NULL DEFAULT 'all_messages',
  ADD COLUMN inactive_channel_id        uuid     REFERENCES public.channels(id) ON DELETE SET NULL,
  ADD COLUMN inactive_timeout           integer;

-- Server Tag columns
ALTER TABLE public.servers
  ADD COLUMN server_tag_name   text,
  ADD COLUMN server_tag_badge  text,
  ADD COLUMN server_tag_color  text;
