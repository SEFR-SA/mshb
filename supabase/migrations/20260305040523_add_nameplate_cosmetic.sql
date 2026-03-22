
CREATE OR REPLACE FUNCTION public.reopen_dm_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.thread_id IS NULL THEN RETURN NEW; END IF;

  UPDATE dm_thread_visibility
  SET is_visible = true, closed_at = NULL
  WHERE thread_id = NEW.thread_id
    AND is_visible = false;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reopen_dm_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
WHEN (NEW.thread_id IS NOT NULL)
EXECUTE FUNCTION public.reopen_dm_on_message();
