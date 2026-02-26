-- 1. Add is_announcement column to channels (backward compatible, defaults false)
ALTER TABLE public.channels
  ADD COLUMN is_announcement boolean NOT NULL DEFAULT false;

-- 2. Helper function: is_channel_announcement
CREATE OR REPLACE FUNCTION public.is_channel_announcement(_channel_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT is_announcement FROM public.channels WHERE id = _channel_id),
    false
  )
$$;

-- 3. Drop current channel INSERT policy and recreate with announcement enforcement
--    Preserves all existing DM / group / private-channel logic, adds announcement check.
DROP POLICY IF EXISTS "Thread participants can insert messages" ON public.messages;

CREATE POLICY "Thread participants can insert messages"
ON public.messages FOR INSERT
WITH CHECK (
  (auth.uid() = author_id)
  AND (
    -- DM thread messages (unchanged)
    (
      (thread_id IS NOT NULL) AND EXISTS (
        SELECT 1 FROM dm_threads t
        WHERE t.id = messages.thread_id
          AND (t.user1_id = auth.uid() OR t.user2_id = auth.uid())
      )
    )
    -- Group thread messages (unchanged)
    OR (
      (group_thread_id IS NOT NULL)
      AND is_group_member(auth.uid(), group_thread_id)
    )
    -- Channel messages (updated with announcement check)
    OR (
      (channel_id IS NOT NULL)
      AND is_server_member(
        auth.uid(),
        (SELECT channels.server_id FROM channels WHERE channels.id = messages.channel_id)
      )
      AND (
        NOT is_channel_private(channel_id)
        OR is_channel_member(auth.uid(), channel_id)
      )
      AND (
        -- Allow if NOT an announcement channel
        NOT is_channel_announcement(channel_id)
        -- OR user is owner/admin in that server
        OR is_server_admin(
          auth.uid(),
          (SELECT channels.server_id FROM channels WHERE channels.id = messages.channel_id)
        )
      )
    )
  )
);
