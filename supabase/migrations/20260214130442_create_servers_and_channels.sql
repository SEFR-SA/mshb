
-- Helper function: generate random 8-char invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT string_agg(substr('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', ceil(random()*62)::int, 1), '')
  FROM generate_series(1,8)
$$;

-- Servers table
CREATE TABLE public.servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon_url text,
  owner_id uuid NOT NULL,
  invite_code text UNIQUE NOT NULL DEFAULT public.generate_invite_code(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;

-- Channels table
CREATE TABLE public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'text',
  category text NOT NULL DEFAULT 'Text Channels',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

-- Server members table
CREATE TABLE public.server_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(server_id, user_id)
);
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;

-- Add channel_id to messages
ALTER TABLE public.messages ADD COLUMN channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE;

-- Helper: is_server_member
CREATE OR REPLACE FUNCTION public.is_server_member(_user_id uuid, _server_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE user_id = _user_id AND server_id = _server_id
  )
$$;

-- Helper: is_server_admin
CREATE OR REPLACE FUNCTION public.is_server_admin(_user_id uuid, _server_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.server_members
    WHERE user_id = _user_id AND server_id = _server_id AND role IN ('owner', 'admin')
  )
$$;

-- RLS: servers
CREATE POLICY "Members can view servers" ON public.servers FOR SELECT
  USING (public.is_server_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create servers" ON public.servers FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Admin can update server" ON public.servers FOR UPDATE
  USING (public.is_server_admin(auth.uid(), id));

-- RLS: channels
CREATE POLICY "Members can view channels" ON public.channels FOR SELECT
  USING (public.is_server_member(auth.uid(), server_id));

CREATE POLICY "Admin can create channels" ON public.channels FOR INSERT
  WITH CHECK (public.is_server_admin(auth.uid(), server_id));

CREATE POLICY "Admin can update channels" ON public.channels FOR UPDATE
  USING (public.is_server_admin(auth.uid(), server_id));

CREATE POLICY "Admin can delete channels" ON public.channels FOR DELETE
  USING (public.is_server_admin(auth.uid(), server_id));

-- RLS: server_members
CREATE POLICY "Members can view server members" ON public.server_members FOR SELECT
  USING (public.is_server_member(auth.uid(), server_id));

CREATE POLICY "Admin can add members" ON public.server_members FOR INSERT
  WITH CHECK (
    public.is_server_admin(auth.uid(), server_id)
    OR (auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.servers WHERE id = server_members.server_id AND owner_id = auth.uid()
    ))
  );

CREATE POLICY "Self can leave" ON public.server_members FOR DELETE
  USING (auth.uid() = user_id OR public.is_server_admin(auth.uid(), server_id));

-- Update messages SELECT policy to include channel_id path
DROP POLICY IF EXISTS "Thread participants can view messages" ON public.messages;
CREATE POLICY "Thread participants can view messages" ON public.messages FOR SELECT
  USING (
    (thread_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM dm_threads t WHERE t.id = messages.thread_id AND (t.user1_id = auth.uid() OR t.user2_id = auth.uid())
    ))
    OR (group_thread_id IS NOT NULL AND is_group_member(auth.uid(), group_thread_id))
    OR (channel_id IS NOT NULL AND public.is_server_member(auth.uid(), (SELECT server_id FROM public.channels WHERE id = messages.channel_id)))
  );

-- Update messages INSERT policy
DROP POLICY IF EXISTS "Thread participants can insert messages" ON public.messages;
CREATE POLICY "Thread participants can insert messages" ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = author_id AND (
      (thread_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM dm_threads t WHERE t.id = messages.thread_id AND (t.user1_id = auth.uid() OR t.user2_id = auth.uid())
      ))
      OR (group_thread_id IS NOT NULL AND is_group_member(auth.uid(), group_thread_id))
      OR (channel_id IS NOT NULL AND public.is_server_member(auth.uid(), (SELECT server_id FROM public.channels WHERE id = messages.channel_id)))
    )
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.channels;
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_members;
