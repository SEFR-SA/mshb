
-- Fix servers SELECT policy: allow owners to see their own servers
DROP POLICY IF EXISTS "Members can view servers" ON public.servers;
CREATE POLICY "Members can view servers" ON public.servers FOR SELECT
  USING (
    public.is_server_member(auth.uid(), id)
    OR owner_id = auth.uid()
  );

-- Fix server_members INSERT policy: allow self-insert
DROP POLICY IF EXISTS "Admin can add members" ON public.server_members;
CREATE POLICY "Admin can add members" ON public.server_members FOR INSERT
  WITH CHECK (
    public.is_server_admin(auth.uid(), server_id)
    OR (auth.uid() = user_id)
  );

-- Create SECURITY DEFINER function for invite code lookup
CREATE OR REPLACE FUNCTION public.get_server_id_by_invite(p_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.servers WHERE invite_code = p_code LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_server_id_by_invite FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_server_id_by_invite TO authenticated;
