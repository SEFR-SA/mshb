
-- Phase 1: Server Join trigger
CREATE OR REPLACE FUNCTION public.notify_on_server_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_id INTO v_owner_id FROM servers WHERE id = NEW.server_id;
  IF v_owner_id IS NOT NULL AND v_owner_id <> NEW.user_id THEN
    INSERT INTO notifications (user_id, actor_id, type, entity_id)
    VALUES (v_owner_id, NEW.user_id, 'server_join', NEW.server_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_server_join
AFTER INSERT ON public.server_members
FOR EACH ROW EXECUTE FUNCTION public.notify_on_server_join();

-- Phase 1: DM Message trigger (with WHEN optimization)
CREATE OR REPLACE FUNCTION public.notify_on_dm_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_other_uid uuid;
BEGIN
  SELECT CASE
    WHEN user1_id = NEW.author_id THEN user2_id
    ELSE user1_id
  END INTO v_other_uid
  FROM dm_threads WHERE id = NEW.thread_id;

  IF v_other_uid IS NOT NULL THEN
    INSERT INTO notifications (user_id, actor_id, type, entity_id)
    VALUES (v_other_uid, NEW.author_id, 'dm_message', NEW.thread_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_dm_message
AFTER INSERT ON public.messages
FOR EACH ROW
WHEN (NEW.thread_id IS NOT NULL)
EXECUTE FUNCTION public.notify_on_dm_message();
