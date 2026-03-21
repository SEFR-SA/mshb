
-- Drop the redundant 3-param overload (CASCADE removes dependent policies)
DROP FUNCTION IF EXISTS public.has_role_permission(uuid, uuid, text) CASCADE;

-- Recreate all dependent RLS policies (they'll now bind to the 4-param version)

-- server_bans
CREATE POLICY "Admins and banned user can view ban" ON public.server_bans
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role_permission(auth.uid(), server_id, 'ban_members')
  );

CREATE POLICY "Members with ban_members can insert bans" ON public.server_bans
  FOR INSERT TO authenticated
  WITH CHECK (has_role_permission(auth.uid(), server_id, 'ban_members'));

CREATE POLICY "Members with ban_members can delete bans" ON public.server_bans
  FOR DELETE TO authenticated
  USING (has_role_permission(auth.uid(), server_id, 'ban_members'));

-- servers
CREATE POLICY "Admin can update server" ON public.servers
  FOR UPDATE TO authenticated
  USING (has_role_permission(auth.uid(), id, 'manage_server'));

-- channels
CREATE POLICY "Admin can create channels" ON public.channels
  FOR INSERT TO authenticated
  WITH CHECK (has_role_permission(auth.uid(), server_id, 'manage_channel'));

CREATE POLICY "Admin can update channels" ON public.channels
  FOR UPDATE TO authenticated
  USING (has_role_permission(auth.uid(), server_id, 'manage_channel'));

CREATE POLICY "Admin can delete channels" ON public.channels
  FOR DELETE TO authenticated
  USING (has_role_permission(auth.uid(), server_id, 'manage_channel'));

CREATE POLICY "Members can view channels" ON public.channels
  FOR SELECT TO authenticated
  USING (
    is_server_member(auth.uid(), server_id)
    AND (
      NOT is_private
      OR is_channel_member(auth.uid(), id)
      OR has_role_permission(auth.uid(), server_id, 'manage_channel')
    )
  );

-- server_roles
CREATE POLICY "Admins can insert roles" ON public.server_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role_permission(auth.uid(), server_id, 'manage_roles'));

CREATE POLICY "Admins can update roles" ON public.server_roles
  FOR UPDATE TO authenticated
  USING (has_role_permission(auth.uid(), server_id, 'manage_roles'));

CREATE POLICY "Admins can delete roles" ON public.server_roles
  FOR DELETE TO authenticated
  USING (has_role_permission(auth.uid(), server_id, 'manage_roles'));

-- member_roles
CREATE POLICY "Admins can assign roles" ON public.member_roles
  FOR INSERT TO authenticated
  WITH CHECK (has_role_permission(auth.uid(), server_id, 'manage_roles'));

CREATE POLICY "Admins can remove roles" ON public.member_roles
  FOR DELETE TO authenticated
  USING (has_role_permission(auth.uid(), server_id, 'manage_roles'));

-- server_members
CREATE POLICY "Self can leave" ON public.server_members
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role_permission(auth.uid(), server_id, 'kick_members')
  );

-- server_emojis
CREATE POLICY "Admins can insert emojis" ON public.server_emojis
  FOR INSERT TO authenticated
  WITH CHECK (has_role_permission(auth.uid(), server_id, 'create_expressions'));

CREATE POLICY "Admins can delete emojis" ON public.server_emojis
  FOR DELETE TO authenticated
  USING (has_role_permission(auth.uid(), server_id, 'create_expressions'));

-- server_stickers
CREATE POLICY "Admins can insert stickers" ON public.server_stickers
  FOR INSERT TO authenticated
  WITH CHECK (has_role_permission(auth.uid(), server_id, 'create_expressions'));

CREATE POLICY "Admins can delete stickers" ON public.server_stickers
  FOR DELETE TO authenticated
  USING (has_role_permission(auth.uid(), server_id, 'create_expressions'));

-- server_soundboard
CREATE POLICY "Admins can insert sounds" ON public.server_soundboard
  FOR INSERT TO authenticated
  WITH CHECK (has_role_permission(auth.uid(), server_id, 'create_expressions'));

CREATE POLICY "Admins can delete sounds" ON public.server_soundboard
  FOR DELETE TO authenticated
  USING (has_role_permission(auth.uid(), server_id, 'create_expressions'));

-- server_audit_logs
CREATE POLICY "Admins can read audit logs" ON public.server_audit_logs
  FOR SELECT TO authenticated
  USING (has_role_permission(auth.uid(), server_id, 'view_audit_log'));

-- invites
CREATE POLICY "Server members can create invites" ON public.invites
  FOR INSERT TO authenticated
  WITH CHECK (has_role_permission(auth.uid(), server_id, 'create_invites'));
