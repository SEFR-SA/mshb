-- Phase 3: Server Media Tables (Emojis, Stickers, Soundboard)
-- All uploads go to the existing server-assets storage bucket under sub-paths.
-- RLS: any server member can SELECT; only admins/owners can INSERT or DELETE.

-- ─────────────────────────────────────────
-- server_emojis
-- ─────────────────────────────────────────
CREATE TABLE public.server_emojis (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id   uuid        NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  url         text        NOT NULL,
  uploaded_by uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.server_emojis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server members can view emojis"
  ON public.server_emojis FOR SELECT
  USING (is_server_member(auth.uid(), server_id));

CREATE POLICY "Admins can insert emojis"
  ON public.server_emojis FOR INSERT
  WITH CHECK (is_server_admin(auth.uid(), server_id));

CREATE POLICY "Admins can delete emojis"
  ON public.server_emojis FOR DELETE
  USING (is_server_admin(auth.uid(), server_id));

-- ─────────────────────────────────────────
-- server_stickers
-- ─────────────────────────────────────────
CREATE TABLE public.server_stickers (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id   uuid        NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  url         text        NOT NULL,
  format      text        NOT NULL DEFAULT 'PNG',
  uploaded_by uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.server_stickers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server members can view stickers"
  ON public.server_stickers FOR SELECT
  USING (is_server_member(auth.uid(), server_id));

CREATE POLICY "Admins can insert stickers"
  ON public.server_stickers FOR INSERT
  WITH CHECK (is_server_admin(auth.uid(), server_id));

CREATE POLICY "Admins can delete stickers"
  ON public.server_stickers FOR DELETE
  USING (is_server_admin(auth.uid(), server_id));

-- ─────────────────────────────────────────
-- server_soundboard
-- ─────────────────────────────────────────
CREATE TABLE public.server_soundboard (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id   uuid        NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  url         text        NOT NULL,
  uploaded_by uuid        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.server_soundboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server members can view soundboard"
  ON public.server_soundboard FOR SELECT
  USING (is_server_member(auth.uid(), server_id));

CREATE POLICY "Admins can insert sounds"
  ON public.server_soundboard FOR INSERT
  WITH CHECK (is_server_admin(auth.uid(), server_id));

CREATE POLICY "Admins can delete sounds"
  ON public.server_soundboard FOR DELETE
  USING (is_server_admin(auth.uid(), server_id));
