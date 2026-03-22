
-- 1. Add is_private column to channels
ALTER TABLE public.channels ADD COLUMN is_private boolean NOT NULL DEFAULT false;

-- 2. Create channel_members table
CREATE TABLE public.channel_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- 3. Security definer: is_channel_member
CREATE OR REPLACE FUNCTION public.is_channel_member(_user_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.channel_members
    WHERE user_id = _user_id AND channel_id = _channel_id
  )
$$;

-- 4. Security definer: is_channel_private
CREATE OR REPLACE FUNCTION public.is_channel_private(_channel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_private FROM public.channels WHERE id = _channel_id),
    false
  )
$$;

-- 5. RLS policies for channel_members
CREATE POLICY "Server members can view channel members"
ON public.channel_members FOR SELECT
USING (
  is_server_member(auth.uid(), (SELECT server_id FROM public.channels WHERE id = channel_id))
);

CREATE POLICY "Server admins can add channel members"
ON public.channel_members FOR INSERT
WITH CHECK (
  is_server_admin(auth.uid(), (SELECT server_id FROM public.channels WHERE id = channel_id))
);

CREATE POLICY "Server admins can remove channel members"
ON public.channel_members FOR DELETE
USING (
  is_server_admin(auth.uid(), (SELECT server_id FROM public.channels WHERE id = channel_id))
);

-- 6. Update messages SELECT policy to check private channel access
DROP POLICY IF EXISTS "Thread participants can view messages" ON public.messages;
CREATE POLICY "Thread participants can view messages"
ON public.messages FOR SELECT
USING (
  (
    (thread_id IS NOT NULL) AND EXISTS (
      SELECT 1 FROM dm_threads t
      WHERE t.id = messages.thread_id AND (t.user1_id = auth.uid() OR t.user2_id = auth.uid())
    )
  )
  OR (
    (group_thread_id IS NOT NULL) AND is_group_member(auth.uid(), group_thread_id)
  )
  OR (
    (channel_id IS NOT NULL)
    AND is_server_member(auth.uid(), (SELECT channels.server_id FROM channels WHERE channels.id = messages.channel_id))
    AND (
      NOT is_channel_private(channel_id)
      OR is_channel_member(auth.uid(), channel_id)
    )
  )
);

-- 7. Update messages INSERT policy to check private channel access
DROP POLICY IF EXISTS "Thread participants can insert messages" ON public.messages;
CREATE POLICY "Thread participants can insert messages"
ON public.messages FOR INSERT
WITH CHECK (
  (auth.uid() = author_id)
  AND (
    (
      (thread_id IS NOT NULL) AND EXISTS (
        SELECT 1 FROM dm_threads t
        WHERE t.id = messages.thread_id AND (t.user1_id = auth.uid() OR t.user2_id = auth.uid())
      )
    )
    OR (
      (group_thread_id IS NOT NULL) AND is_group_member(auth.uid(), group_thread_id)
    )
    OR (
      (channel_id IS NOT NULL)
      AND is_server_member(auth.uid(), (SELECT channels.server_id FROM channels WHERE channels.id = messages.channel_id))
      AND (
        NOT is_channel_private(channel_id)
        OR is_channel_member(auth.uid(), channel_id)
      )
    )
  )
);

-- 8. Enable realtime for channel_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_members;
