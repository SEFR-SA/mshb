-- ─── Guard: skip notifications when the system bot joins a server ─────────────
CREATE OR REPLACE FUNCTION public.notify_on_server_join()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public' AS $$
DECLARE v_owner_id uuid;
BEGIN
  -- System bot never triggers join notifications
  IF NEW.user_id = '00000000-0000-0000-0000-000000000001' THEN
    RETURN NEW;
  END IF;
  SELECT owner_id INTO v_owner_id FROM servers WHERE id = NEW.server_id;
  IF v_owner_id IS NOT NULL AND v_owner_id <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, entity_id)
    VALUES (v_owner_id, NEW.user_id, 'server_join', NEW.server_id);
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Guard: skip welcome message when the system bot joins a server ───────────
CREATE OR REPLACE FUNCTION public.trigger_welcome_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_enabled boolean; v_channel_id uuid;
BEGIN
  -- System bot never triggers welcome messages
  IF NEW.user_id = '00000000-0000-0000-0000-000000000001' THEN
    RETURN NEW;
  END IF;
  SELECT welcome_message_enabled, system_message_channel_id
    INTO v_enabled, v_channel_id
    FROM public.servers WHERE id = NEW.server_id;
  IF v_enabled AND v_channel_id IS NOT NULL THEN
    INSERT INTO public.messages (author_id, channel_id, content, type)
    VALUES (NEW.user_id, v_channel_id, 'joined the server!', 'welcome');
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Bulk-add bot to all existing servers (triggers now skip silently) ─────────
INSERT INTO public.server_members (server_id, user_id, role)
SELECT s.id, '00000000-0000-0000-0000-000000000001', 'member'
FROM public.servers s
ON CONFLICT (server_id, user_id) DO NOTHING;

-- ─── Auto-join bot when a new server is created ───────────────────────────────
CREATE OR REPLACE FUNCTION public.auto_add_bot_to_server()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.server_members (server_id, user_id, role)
  VALUES (NEW.id, '00000000-0000-0000-0000-000000000001', 'member')
  ON CONFLICT (server_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_add_bot ON public.servers;
CREATE TRIGGER trg_auto_add_bot
  AFTER INSERT ON public.servers
  FOR EACH ROW EXECUTE FUNCTION public.auto_add_bot_to_server();
