
-- 1. Create validate_invite RPC (SECURITY DEFINER, bypasses RLS)
CREATE OR REPLACE FUNCTION public.validate_invite(p_code text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row record;
BEGIN
  SELECT i.server_id, i.expires_at, i.max_uses, i.use_count,
         s.name, s.icon_url, s.banner_url, s.created_at as server_created_at
  INTO v_row
  FROM invites i JOIN servers s ON s.id = i.server_id
  WHERE i.code = p_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN jsonb_build_object('status', 'expired');
  END IF;

  IF v_row.max_uses IS NOT NULL AND v_row.use_count >= v_row.max_uses THEN
    RETURN jsonb_build_object('status', 'maxed');
  END IF;

  RETURN jsonb_build_object(
    'status', 'valid',
    'server_id', v_row.server_id,
    'server_name', v_row.name,
    'server_icon_url', v_row.icon_url,
    'server_banner_url', v_row.banner_url,
    'server_created_at', v_row.server_created_at,
    'expires_at', v_row.expires_at,
    'max_uses', v_row.max_uses,
    'use_count', v_row.use_count,
    'member_count', (SELECT COUNT(*) FROM server_members sm WHERE sm.server_id = v_row.server_id),
    'online_count', (SELECT COUNT(*) FROM profiles p JOIN server_members sm2 ON sm2.user_id = p.user_id AND sm2.server_id = v_row.server_id WHERE p.last_seen > now() - interval '5 minutes')
  );
END;
$$;

-- 2. Update use_invite to atomically insert membership
CREATE OR REPLACE FUNCTION public.use_invite(p_code text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_server_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  UPDATE invites
  SET use_count = use_count + 1
  WHERE code = p_code
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR use_count < max_uses)
  RETURNING server_id INTO v_server_id;

  IF v_server_id IS NULL THEN RETURN NULL; END IF;

  INSERT INTO server_members (server_id, user_id, role)
  VALUES (v_server_id, v_user_id, 'member')
  ON CONFLICT DO NOTHING;

  RETURN v_server_id;
END;
$$;
