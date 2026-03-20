-- ─── Role-Based Permission Enforcement ────────────────────────────────────────
-- Adds has_role_permission(), has_channel_permission(), get_user_permissions(),
-- restricted_permissions column on channels, server_bans table, ban RPCs,
-- delete_channel_message RPC, updated RLS policies, and data migration.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- has_role_permission: checks if a user has a specific permission in a server.
-- Owner/admin always return true. Otherwise checks custom roles (additive/OR).
-- Default-ON permissions: create_invites, send_messages, attach_files,
--   create_polls, connect, speak, video
CREATE OR REPLACE FUNCTION public.has_role_permission(
  _user_id   uuid,
  _server_id uuid,
  _permission text
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _base_role text;
  _granted   boolean;
BEGIN
  SELECT role INTO _base_role
    FROM server_members
   WHERE user_id = _user_id AND server_id = _server_id;

  IF _base_role IS NULL THEN RETURN false; END IF;          -- not a member
  IF _base_role IN ('owner', 'admin') THEN RETURN true; END IF; -- bypass

  -- Check if ANY assigned role grants this permission
  SELECT bool_or((sr.permissions ->> _permission)::boolean) INTO _granted
    FROM member_roles  mr
    JOIN server_roles  sr ON sr.id = mr.role_id
   WHERE mr.user_id = _user_id AND mr.server_id = _server_id;

  IF _granted IS TRUE THEN RETURN true; END IF;

  -- Default-ON permissions for members without a matching role grant
  RETURN _permission IN (
    'create_invites', 'send_messages', 'attach_files',
    'create_polls', 'connect', 'speak', 'video'
  );
END;
$$;

-- has_channel_permission: checks if user can perform action in a specific channel.
-- If the permission is NOT in restricted_permissions, everyone can do it.
-- If it IS restricted, delegates to has_role_permission.
CREATE OR REPLACE FUNCTION public.has_channel_permission(
  _user_id    uuid,
  _channel_id uuid,
  _permission text
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _server_id   uuid;
  _restricted  text[];
BEGIN
  SELECT server_id, COALESCE(restricted_permissions, '{}')
    INTO _server_id, _restricted
    FROM channels
   WHERE id = _channel_id;

  IF _server_id IS NULL THEN RETURN false; END IF;

  -- If permission is not restricted on this channel, everyone can act
  IF NOT (_permission = ANY(_restricted)) THEN RETURN true; END IF;

  -- Permission is restricted — delegate to role check
  RETURN has_role_permission(_user_id, _server_id, _permission);
END;
$$;

-- get_user_permissions: returns all 19 computed permissions for auth.uid()
-- in a server as a single JSONB object. Used by the frontend hook.
CREATE OR REPLACE FUNCTION public.get_user_permissions(_server_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid      uuid    := auth.uid();
  _result   jsonb   := '{}';
  _all_perms text[] := ARRAY[
    'manage_roles','create_expressions','view_audit_log','manage_server',
    'create_invites','kick_members','ban_members','view_channel',
    'manage_channel','send_messages','attach_files','mention_everyone',
    'delete_messages','create_polls','connect','speak','video',
    'mute_members','deafen_members'
  ];
  _key text;
BEGIN
  FOREACH _key IN ARRAY _all_perms LOOP
    _result := _result || jsonb_build_object(
      _key, has_role_permission(_uid, _server_id, _key)
    );
  END LOOP;
  RETURN _result;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. SCHEMA CHANGES
-- ═══════════════════════════════════════════════════════════════════════════════

-- Channel-level permission restrictions (array of restricted permission keys)
ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS restricted_permissions TEXT[] NOT NULL DEFAULT '{}';

-- Ban system
CREATE TABLE IF NOT EXISTS public.server_bans (
  id         uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id  uuid        NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL,
  banned_by  uuid        NOT NULL,
  reason     text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(server_id, user_id)
);
ALTER TABLE public.server_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and banned user can view ban"
  ON public.server_bans FOR SELECT
  USING (
    has_role_permission(auth.uid(), server_id, 'ban_members')
    OR auth.uid() = user_id
  );

CREATE POLICY "Members with ban_members can insert bans"
  ON public.server_bans FOR INSERT
  WITH CHECK (has_role_permission(auth.uid(), server_id, 'ban_members'));

CREATE POLICY "Members with ban_members can delete bans"
  ON public.server_bans FOR DELETE
  USING (has_role_permission(auth.uid(), server_id, 'ban_members'));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_member_roles_user_server
  ON public.member_roles (user_id, server_id);

CREATE INDEX IF NOT EXISTS idx_server_members_user_server
  ON public.server_members (user_id, server_id);

CREATE INDEX IF NOT EXISTS idx_server_bans_server_user
  ON public.server_bans (server_id, user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. DATA MIGRATION — rename old permission keys in existing roles
-- ═══════════════════════════════════════════════════════════════════════════════

UPDATE public.server_roles
SET permissions = (
  permissions
  - 'view_channels'
  - 'manage_channels'
  - 'create_invite'
  - 'add_reactions'
)
|| CASE WHEN permissions ? 'view_channels'
        THEN jsonb_build_object('view_channel',  (permissions ->> 'view_channels')::boolean)
        ELSE '{}'::jsonb END
|| CASE WHEN permissions ? 'manage_channels'
        THEN jsonb_build_object('manage_channel', (permissions ->> 'manage_channels')::boolean)
        ELSE '{}'::jsonb END
|| CASE WHEN permissions ? 'create_invite'
        THEN jsonb_build_object('create_invites', (permissions ->> 'create_invite')::boolean)
        ELSE '{}'::jsonb END
WHERE permissions ?| ARRAY['view_channels','manage_channels','create_invite','add_reactions'];

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. RLS POLICY UPDATES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── servers ──────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admin can update server" ON public.servers;
CREATE POLICY "Admin can update server" ON public.servers
  FOR UPDATE USING (has_role_permission(auth.uid(), id, 'manage_server'));

-- ── channels INSERT / UPDATE / DELETE ────────────────────────────────────────
DROP POLICY IF EXISTS "Admin can create channels" ON public.channels;
CREATE POLICY "Admin can create channels" ON public.channels
  FOR INSERT WITH CHECK (has_role_permission(auth.uid(), server_id, 'manage_channel'));

DROP POLICY IF EXISTS "Admin can update channels" ON public.channels;
CREATE POLICY "Admin can update channels" ON public.channels
  FOR UPDATE USING (has_role_permission(auth.uid(), server_id, 'manage_channel'));

DROP POLICY IF EXISTS "Admin can delete channels" ON public.channels;
CREATE POLICY "Admin can delete channels" ON public.channels
  FOR DELETE USING (has_role_permission(auth.uid(), server_id, 'manage_channel'));

-- ── channels SELECT — add role-based access to private channels ──────────────
DROP POLICY IF EXISTS "Members can view channels" ON public.channels;
CREATE POLICY "Members can view channels" ON public.channels
  FOR SELECT USING (
    (
      is_server_member(auth.uid(), server_id)
      OR EXISTS (SELECT 1 FROM servers s WHERE s.id = channels.server_id AND s.owner_id = auth.uid())
    )
    AND (
      is_private = false
      OR is_channel_member(auth.uid(), id)
      OR is_server_admin(auth.uid(), server_id)
      OR has_role_permission(auth.uid(), server_id, 'view_channel')
      OR EXISTS (SELECT 1 FROM servers s WHERE s.id = channels.server_id AND s.owner_id = auth.uid())
    )
  );

-- ── server_roles ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert roles" ON public.server_roles;
CREATE POLICY "Admins can insert roles" ON public.server_roles
  FOR INSERT WITH CHECK (has_role_permission(auth.uid(), server_id, 'manage_roles'));

DROP POLICY IF EXISTS "Admins can update roles" ON public.server_roles;
CREATE POLICY "Admins can update roles" ON public.server_roles
  FOR UPDATE USING (has_role_permission(auth.uid(), server_id, 'manage_roles'));

DROP POLICY IF EXISTS "Admins can delete roles" ON public.server_roles;
CREATE POLICY "Admins can delete roles" ON public.server_roles
  FOR DELETE USING (has_role_permission(auth.uid(), server_id, 'manage_roles'));

-- ── member_roles ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can assign roles" ON public.member_roles;
CREATE POLICY "Admins can assign roles" ON public.member_roles
  FOR INSERT WITH CHECK (has_role_permission(auth.uid(), server_id, 'manage_roles'));

DROP POLICY IF EXISTS "Admins can remove roles" ON public.member_roles;
CREATE POLICY "Admins can remove roles" ON public.member_roles
  FOR DELETE USING (has_role_permission(auth.uid(), server_id, 'manage_roles'));

-- ── server_members DELETE (kick) ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Self can leave" ON public.server_members;
CREATE POLICY "Self can leave" ON public.server_members
  FOR DELETE USING (
    auth.uid() = user_id
    OR has_role_permission(auth.uid(), server_id, 'kick_members')
  );

-- ── server_members INSERT — add ban check ────────────────────────────────────
-- Recreate the fix from 20260319100004, adding ban prevention
DROP POLICY IF EXISTS "Admin can add members" ON public.server_members;
CREATE POLICY "Admin can add members" ON public.server_members
  FOR INSERT WITH CHECK (
    -- Cannot join if banned
    NOT EXISTS (
      SELECT 1 FROM public.server_bans
      WHERE server_bans.server_id = server_members.server_id
        AND server_bans.user_id   = server_members.user_id
    )
    AND (
      -- Existing admins/owners can add others
      is_server_admin(auth.uid(), server_id)
      -- Regular users joining via invite (role='member')
      OR (auth.uid() = user_id AND role = 'member')
      -- Server creator inserts themselves as 'owner'
      OR (
        auth.uid() = user_id
        AND role = 'owner'
        AND EXISTS (
          SELECT 1 FROM public.servers
          WHERE id = server_id AND owner_id = auth.uid()
        )
      )
    )
  );

-- ── server_emojis ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert emojis" ON public.server_emojis;
CREATE POLICY "Admins can insert emojis" ON public.server_emojis
  FOR INSERT WITH CHECK (has_role_permission(auth.uid(), server_id, 'create_expressions'));

DROP POLICY IF EXISTS "Admins can delete emojis" ON public.server_emojis;
CREATE POLICY "Admins can delete emojis" ON public.server_emojis
  FOR DELETE USING (has_role_permission(auth.uid(), server_id, 'create_expressions'));

-- ── server_stickers ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert stickers" ON public.server_stickers;
CREATE POLICY "Admins can insert stickers" ON public.server_stickers
  FOR INSERT WITH CHECK (has_role_permission(auth.uid(), server_id, 'create_expressions'));

DROP POLICY IF EXISTS "Admins can delete stickers" ON public.server_stickers;
CREATE POLICY "Admins can delete stickers" ON public.server_stickers
  FOR DELETE USING (has_role_permission(auth.uid(), server_id, 'create_expressions'));

-- ── server_soundboard ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert sounds" ON public.server_soundboard;
CREATE POLICY "Admins can insert sounds" ON public.server_soundboard
  FOR INSERT WITH CHECK (has_role_permission(auth.uid(), server_id, 'create_expressions'));

DROP POLICY IF EXISTS "Admins can delete sounds" ON public.server_soundboard;
CREATE POLICY "Admins can delete sounds" ON public.server_soundboard
  FOR DELETE USING (has_role_permission(auth.uid(), server_id, 'create_expressions'));

-- ── server_audit_logs ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.server_audit_logs;
CREATE POLICY "Admins can read audit logs" ON public.server_audit_logs
  FOR SELECT USING (has_role_permission(auth.uid(), server_id, 'view_audit_log'));

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.server_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.server_audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() = actor_id
    AND is_server_member(auth.uid(), server_id)
  );

-- ── messages INSERT — add send_messages channel permission check ──────────────
DROP POLICY IF EXISTS "Thread participants can insert messages" ON public.messages;
CREATE POLICY "Thread participants can insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    (auth.uid() = author_id)
    AND (
      -- DM thread messages (unchanged)
      (
        (thread_id IS NOT NULL)
        AND EXISTS (
          SELECT 1 FROM dm_threads t
          WHERE t.id = messages.thread_id
            AND (t.user1_id = auth.uid() OR t.user2_id = auth.uid())
        )
      )
      -- Group thread messages (unchanged)
      OR (
        (group_thread_id IS NOT NULL)
        AND is_group_member(auth.uid(), group_thread_id)
      )
      -- Channel messages with permission checks
      OR (
        (channel_id IS NOT NULL)
        AND is_server_member(
          auth.uid(),
          (SELECT channels.server_id FROM channels WHERE channels.id = messages.channel_id)
        )
        AND (
          NOT is_channel_private(channel_id)
          OR is_channel_member(auth.uid(), channel_id)
        )
        AND (
          NOT COALESCE((SELECT (is_announcement OR is_rules) FROM channels WHERE id = channel_id), false)
          OR is_server_admin(
            auth.uid(),
            (SELECT channels.server_id FROM channels WHERE channels.id = messages.channel_id)
          )
        )
        AND has_channel_permission(auth.uid(), channel_id, 'send_messages')
      )
    )
  );

-- ── voice_channel_participants INSERT — add connect permission check ───────────
DROP POLICY IF EXISTS "Users can join voice channels" ON public.voice_channel_participants;
CREATE POLICY "Users can join voice channels"
  ON public.voice_channel_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND has_channel_permission(
      auth.uid(),
      channel_id,
      'connect'
    )
  );

-- ── invites INSERT — require create_invites permission ────────────────────────
DROP POLICY IF EXISTS "Server members can create invites" ON public.invites;
CREATE POLICY "Server members can create invites" ON public.invites
  FOR INSERT WITH CHECK (
    auth.uid() = creator_id
    AND has_role_permission(auth.uid(), server_id, 'create_invites')
  );

-- ── polls INSERT — add create_polls channel permission check ──────────────────
DROP POLICY IF EXISTS "Message author can create poll" ON public.polls;
CREATE POLICY "Message author can create poll" ON public.polls
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id
        AND m.author_id = auth.uid()
        AND has_channel_permission(auth.uid(), m.channel_id, 'create_polls')
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. NEW RPCs
-- ═══════════════════════════════════════════════════════════════════════════════

-- delete_channel_message: allows message author OR user with delete_messages permission
-- to soft-delete (deleted_for_everyone) any message in a channel.
CREATE OR REPLACE FUNCTION public.delete_channel_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_channel_id uuid;
  v_author_id  uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT channel_id, author_id INTO v_channel_id, v_author_id
    FROM messages WHERE id = p_message_id;

  IF v_channel_id IS NULL THEN RAISE EXCEPTION 'Message not found'; END IF;

  IF v_uid <> v_author_id
     AND NOT has_channel_permission(v_uid, v_channel_id, 'delete_messages') THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  UPDATE messages
     SET deleted_for_everyone = true, content = ''
   WHERE id = p_message_id;
END;
$$;

-- ban_server_member: removes from server_members, records ban, purges messages.
CREATE OR REPLACE FUNCTION public.ban_server_member(
  p_server_id uuid,
  p_user_id   uuid,
  p_reason    text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller      uuid := auth.uid();
  v_target_role text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT has_role_permission(v_caller, p_server_id, 'ban_members') THEN
    RAISE EXCEPTION 'Permission denied: ban_members required';
  END IF;

  -- Prevent banning server owner or other admins
  SELECT role INTO v_target_role
    FROM server_members
   WHERE server_id = p_server_id AND user_id = p_user_id;

  IF v_target_role IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Cannot ban an owner or admin';
  END IF;

  -- Purge messages (soft delete)
  UPDATE messages
     SET deleted_for_everyone = true, content = ''
   WHERE author_id = p_user_id
     AND channel_id IN (SELECT id FROM channels WHERE server_id = p_server_id)
     AND deleted_for_everyone IS NOT TRUE;

  -- Remove from server
  DELETE FROM server_members
   WHERE server_id = p_server_id AND user_id = p_user_id;

  -- Record ban
  INSERT INTO server_bans (server_id, user_id, banned_by, reason)
  VALUES (p_server_id, p_user_id, v_caller, p_reason)
  ON CONFLICT (server_id, user_id) DO NOTHING;

  -- Audit log
  INSERT INTO server_audit_logs (server_id, actor_id, action_type, target_id,
    changes)
  VALUES (p_server_id, v_caller, 'member_banned', p_user_id,
    jsonb_build_object('reason', p_reason));
END;
$$;

-- unban_server_member: removes ban record, allowing the user to rejoin.
CREATE OR REPLACE FUNCTION public.unban_server_member(
  p_server_id uuid,
  p_user_id   uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  IF NOT has_role_permission(v_caller, p_server_id, 'ban_members') THEN
    RAISE EXCEPTION 'Permission denied: ban_members required';
  END IF;

  DELETE FROM server_bans
   WHERE server_id = p_server_id AND user_id = p_user_id;

  INSERT INTO server_audit_logs (server_id, actor_id, action_type, target_id)
  VALUES (p_server_id, v_caller, 'member_unbanned', p_user_id);
END;
$$;

-- Update use_invite to check server_bans before allowing join
CREATE OR REPLACE FUNCTION public.use_invite(p_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_server_id uuid;
  v_user_id   uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  UPDATE invites
     SET use_count = use_count + 1
   WHERE code = p_code
     AND (expires_at IS NULL OR expires_at > now())
     AND (max_uses IS NULL OR use_count < max_uses)
  RETURNING server_id INTO v_server_id;

  IF v_server_id IS NULL THEN RETURN NULL; END IF;

  -- Reject if banned
  IF EXISTS (
    SELECT 1 FROM server_bans
     WHERE server_id = v_server_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'banned';
  END IF;

  INSERT INTO server_members (server_id, user_id, role)
  VALUES (v_server_id, v_user_id, 'member')
  ON CONFLICT DO NOTHING;

  RETURN v_server_id;
END;
$$;
