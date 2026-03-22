
-- Create invites table
CREATE TABLE public.invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  code text UNIQUE NOT NULL DEFAULT generate_invite_code(),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  max_uses integer,
  use_count integer NOT NULL DEFAULT 0,
  temporary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- RLS: server members can view invites for their servers
CREATE POLICY "Server members can view invites"
ON public.invites FOR SELECT
USING (is_server_member(auth.uid(), server_id));

-- RLS: server members can create invites
CREATE POLICY "Server members can create invites"
ON public.invites FOR INSERT
WITH CHECK (auth.uid() = creator_id AND is_server_member(auth.uid(), server_id));

-- RLS: creator can update own invites
CREATE POLICY "Creator can update own invites"
ON public.invites FOR UPDATE
USING (auth.uid() = creator_id);

-- RLS: creator or admin can delete invites
CREATE POLICY "Creator or admin can delete invites"
ON public.invites FOR DELETE
USING (auth.uid() = creator_id OR is_server_admin(auth.uid(), server_id));

-- Function: validate invite and return server_id
CREATE OR REPLACE FUNCTION public.get_server_id_by_invite_link(p_code text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT server_id FROM public.invites
  WHERE code = p_code
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses)
  LIMIT 1;
$$;

-- Function: atomically increment use_count
CREATE OR REPLACE FUNCTION public.use_invite(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_server_id uuid;
BEGIN
  UPDATE public.invites
  SET use_count = use_count + 1
  WHERE code = p_code
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses)
  RETURNING server_id INTO v_server_id;
  RETURN v_server_id;
END;
$$;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.invites;
