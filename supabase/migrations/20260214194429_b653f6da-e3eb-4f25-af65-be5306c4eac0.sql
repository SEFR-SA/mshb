
-- Create channel_read_status table
CREATE TABLE public.channel_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (channel_id, user_id)
);

ALTER TABLE public.channel_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own read status"
  ON public.channel_read_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own read status"
  ON public.channel_read_status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own read status"
  ON public.channel_read_status FOR UPDATE
  USING (auth.uid() = user_id);

-- Add is_screen_sharing to voice_channel_participants
ALTER TABLE public.voice_channel_participants
  ADD COLUMN is_screen_sharing boolean NOT NULL DEFAULT false;

-- Enable realtime for channel_read_status
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_read_status;
