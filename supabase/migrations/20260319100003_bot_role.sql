-- ─── Set bot's role to 'bot' in all existing servers ────────────────────────
-- server_members.role is a free-text column (no enum/CHECK constraint)
UPDATE public.server_members
SET role = 'bot'
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- ─── Fix auto-add trigger to use 'bot' role going forward ───────────────────
CREATE OR REPLACE FUNCTION public.auto_add_bot_to_server()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.server_members (server_id, user_id, role)
  VALUES (NEW.id, '00000000-0000-0000-0000-000000000001', 'bot')
  ON CONFLICT (server_id, user_id) DO UPDATE SET role = 'bot';
  RETURN NEW;
END;
$$;
