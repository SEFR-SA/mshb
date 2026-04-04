
CREATE UNIQUE INDEX IF NOT EXISTS unique_server_tag_name_lower_idx
  ON public.servers (LOWER(server_tag_name))
  WHERE server_tag_name IS NOT NULL;

CREATE OR REPLACE FUNCTION public.check_server_tag_available(p_tag text, p_current_server_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.servers
    WHERE LOWER(server_tag_name) = LOWER(p_tag)
      AND id != p_current_server_id
  );
$$;
