-- =============================================================================
-- Fix Role Permission Enforcement Bugs
-- Root cause: has_role_permission() default-ON fallback defeats channel
-- restrictions. has_channel_permission() delegates to has_role_permission()
-- which always returns true for 7 default-ON permissions (send_messages,
-- connect, etc.) even when the channel restricts them to "Selected Roles Only".
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fix has_role_permission: add _skip_defaults parameter
--    DEFAULT false = all existing callers (RLS policies, RPCs, edge functions)
--    are completely unaffected. Only has_channel_permission passes true.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.has_role_permission(
  _user_id       uuid,
  _server_id     uuid,
  _permission    text,
  _skip_defaults boolean DEFAULT false
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

  -- Check if ANY assigned role explicitly grants this permission
  SELECT bool_or((sr.permissions ->> _permission)::boolean) INTO _granted
    FROM member_roles  mr
    JOIN server_roles  sr ON sr.id = mr.role_id
   WHERE mr.user_id = _user_id AND mr.server_id = _server_id;

  IF _granted IS TRUE THEN RETURN true; END IF;

  -- Default-ON permissions: skip when called from channel restriction context
  IF _skip_defaults THEN RETURN false; END IF;

  RETURN _permission IN (
    'create_invites', 'send_messages', 'attach_files',
    'create_polls', 'connect', 'speak', 'video'
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Fix has_channel_permission: pass _skip_defaults := true
--    When a permission IS restricted on a channel, only explicit role grants
--    (or owner/admin) allow the action. Default-ON no longer fires.
-- ─────────────────────────────────────────────────────────────────────────────
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

  -- Permission IS restricted — only explicit role grants allowed (skip defaults)
  RETURN has_role_permission(_user_id, _server_id, _permission, true);
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add get_user_permissions_strict RPC
--    Returns what the user's roles EXPLICITLY grant (no default-ON fallback).
--    Used by the frontend for channel-level permission intersection.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_permissions_strict(_server_id uuid)
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
      _key, has_role_permission(_uid, _server_id, _key, true)
    );
  END LOOP;
  RETURN _result;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Add disconnect_voice_user RPC
--    Allows users with kick_members to disconnect another voice participant.
--    SECURITY DEFINER bypasses the voice_channel_participants DELETE RLS
--    (which only allows auth.uid() = user_id).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.disconnect_voice_user(
  p_channel_id uuid,
  p_user_id    uuid
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _server_id uuid;
BEGIN
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get the server for this channel
  SELECT server_id INTO _server_id
    FROM channels
   WHERE id = p_channel_id;

  IF _server_id IS NULL THEN
    RAISE EXCEPTION 'Channel not found';
  END IF;

  -- Verify caller has kick_members permission (owner/admin bypass included)
  IF NOT has_role_permission(_caller_id, _server_id, 'kick_members') THEN
    RAISE EXCEPTION 'Permission denied: kick_members required';
  END IF;

  -- Remove the target user from the voice channel
  DELETE FROM voice_channel_participants
   WHERE channel_id = p_channel_id
     AND user_id = p_user_id;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Fix audit log INSERT policy: restore is_server_admin (was accidentally
--    loosened to is_server_member in the previous migration)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.server_audit_logs;
CREATE POLICY "Admins can insert audit logs" ON public.server_audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() = actor_id
    AND is_server_admin(auth.uid(), server_id)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Fix voice_channel_participants INSERT: add private channel access check
--    (mirrors the pattern already used in the messages INSERT policy)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can join voice channels" ON public.voice_channel_participants;
CREATE POLICY "Users can join voice channels"
  ON public.voice_channel_participants FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND has_channel_permission(auth.uid(), channel_id, 'connect')
    AND (
      NOT is_channel_private(channel_id)
      OR is_channel_member(auth.uid(), channel_id)
      OR is_server_admin(
        auth.uid(),
        (SELECT channels.server_id FROM channels WHERE channels.id = voice_channel_participants.channel_id)
      )
    )
  );
