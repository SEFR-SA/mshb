
-- Backend security gate: reject community-exclusive channel types for non-community servers
CREATE OR REPLACE FUNCTION public.validate_community_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.type = 'support' OR NEW.is_announcement = true OR NEW.is_rules = true THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.servers WHERE id = NEW.server_id AND is_community = true
    ) THEN
      RAISE EXCEPTION 'Community features require a Community Server';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_community_channel
BEFORE INSERT ON public.channels
FOR EACH ROW EXECUTE FUNCTION public.validate_community_channel();
