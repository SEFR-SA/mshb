
-- 1. Fix RLS: Allow admins to disconnect users from voice channels
DROP POLICY "Users can leave voice channels" ON voice_channel_participants;
CREATE POLICY "Users can leave or admins disconnect" ON voice_channel_participants
  FOR DELETE USING (
    auth.uid() = user_id
    OR is_server_admin(auth.uid(), (SELECT channels.server_id FROM channels WHERE channels.id = voice_channel_participants.channel_id))
  );

-- 2. Add reply_to_id column to messages
ALTER TABLE public.messages ADD COLUMN reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL;
