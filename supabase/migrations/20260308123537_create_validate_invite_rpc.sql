
-- =============================================
-- SECURITY FIX: Prevent privilege escalation in server_members
-- Self-joins must use role='member', and entrance_sound update is scoped
-- =============================================

-- Fix INSERT: self-joins forced to 'member' role
DROP POLICY IF EXISTS "Admin can add members" ON public.server_members;

CREATE POLICY "Admin can add members" ON public.server_members
  FOR INSERT WITH CHECK (
    (is_server_admin(auth.uid(), server_id))
    OR
    (auth.uid() = user_id AND role = 'member')
  );

-- Fix UPDATE: restrict self-update to entrance_sound_id only
DROP POLICY IF EXISTS "Members can update own entrance sound" ON public.server_members;

-- Create a function to safely update entrance sound only
CREATE OR REPLACE FUNCTION public.update_entrance_sound(p_server_id uuid, p_sound_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE server_members
  SET entrance_sound_id = p_sound_id
  WHERE user_id = auth.uid() AND server_id = p_server_id;
END;
$$;
