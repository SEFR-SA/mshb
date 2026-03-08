
DO $$
BEGIN
  -- Only add tables not already in the publication
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'group_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pinned_chats') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pinned_chats;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'servers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'server_soundboard') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.server_soundboard;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'member_roles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.member_roles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'server_roles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.server_roles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'server_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.server_members;
  END IF;
END $$;
