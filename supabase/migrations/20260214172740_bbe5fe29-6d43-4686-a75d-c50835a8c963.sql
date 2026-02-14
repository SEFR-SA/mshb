
-- Add is_speaking column to voice_channel_participants
ALTER TABLE public.voice_channel_participants ADD COLUMN is_speaking BOOLEAN NOT NULL DEFAULT false;

-- Add UPDATE policy so users can update their own speaking state
CREATE POLICY "Users can update own speaking state"
ON public.voice_channel_participants
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
