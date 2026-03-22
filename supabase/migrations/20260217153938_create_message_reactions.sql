
-- Create message_reactions table
CREATE TABLE public.message_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone who can see the message can see reactions
CREATE POLICY "Users can view reactions on visible messages"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m WHERE m.id = message_reactions.message_id
    AND (
      (m.thread_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM dm_threads t WHERE t.id = m.thread_id AND (t.user1_id = auth.uid() OR t.user2_id = auth.uid())
      ))
      OR (m.group_thread_id IS NOT NULL AND is_group_member(auth.uid(), m.group_thread_id))
      OR (m.channel_id IS NOT NULL AND is_server_member(auth.uid(), (SELECT channels.server_id FROM channels WHERE channels.id = m.channel_id))
        AND (NOT is_channel_private(m.channel_id) OR is_channel_member(auth.uid(), m.channel_id)))
    )
  )
);

-- Users can add reactions
CREATE POLICY "Users can add reactions"
ON public.message_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can remove own reactions
CREATE POLICY "Users can remove own reactions"
ON public.message_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
