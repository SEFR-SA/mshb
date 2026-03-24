DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'voice_channel_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_channel_participants;
  END IF;
END $$;

ALTER TABLE public.voice_channel_participants REPLICA IDENTITY FULL;