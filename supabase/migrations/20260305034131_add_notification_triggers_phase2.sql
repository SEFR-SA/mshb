
CREATE OR REPLACE FUNCTION public.notify_on_mention()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_server_id uuid;
  v_mention text;
  v_target_uid uuid;
BEGIN
  IF NEW.channel_id IS NULL THEN RETURN NEW; END IF;

  SELECT server_id INTO v_server_id FROM channels WHERE id = NEW.channel_id;
  IF v_server_id IS NULL THEN RETURN NEW; END IF;

  IF NEW.content ILIKE '%@all%' OR NEW.content ILIKE '%@everyone%' THEN
    INSERT INTO notifications (user_id, actor_id, type, entity_id)
    SELECT sm.user_id, NEW.author_id, 'mention', NEW.id
    FROM server_members sm
    WHERE sm.server_id = v_server_id AND sm.user_id <> NEW.author_id;
  ELSE
    FOR v_mention IN SELECT (regexp_matches(NEW.content, '@(\w+)', 'g'))[1] LOOP
      SELECT p.user_id INTO v_target_uid
      FROM profiles p
      JOIN server_members sm ON sm.user_id = p.user_id AND sm.server_id = v_server_id
      WHERE p.username = v_mention
      LIMIT 1;

      IF v_target_uid IS NOT NULL AND v_target_uid <> NEW.author_id THEN
        INSERT INTO notifications (user_id, actor_id, type, entity_id)
        VALUES (v_target_uid, NEW.author_id, 'mention', NEW.id);
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_mention
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_on_mention();
