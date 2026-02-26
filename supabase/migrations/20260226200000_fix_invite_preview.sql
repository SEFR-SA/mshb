
-- Fix invite landing page: create a SECURITY DEFINER function that returns all
-- server preview data for a given invite code in one call.
--
-- Why: The `servers`, `invites`, and `server_members` tables have RLS policies
-- that require the caller to already be a member of the server. This makes the
-- invite landing page (/invite/:code) always show "invalid" to new users and
-- unauthenticated visitors, even when the invite is perfectly valid.
--
-- This function bypasses RLS (SECURITY DEFINER) and only exposes data when the
-- caller supplies a valid, non-expired, non-maxed-out invite code.

CREATE OR REPLACE FUNCTION public.get_server_preview_by_invite(p_code text)
RETURNS TABLE(
  id uuid,
  name text,
  icon_url text,
  banner_url text,
  server_created_at timestamptz,
  expires_at timestamptz,
  max_uses integer,
  use_count integer,
  member_count bigint,
  online_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    s.id,
    s.name,
    s.icon_url,
    s.banner_url,
    s.created_at AS server_created_at,
    i.expires_at,
    i.max_uses,
    i.use_count,
    (SELECT COUNT(*) FROM public.server_members sm WHERE sm.server_id = s.id) AS member_count,
    (SELECT COUNT(*)
       FROM public.profiles p
       JOIN public.server_members sm2 ON sm2.user_id = p.user_id AND sm2.server_id = s.id
       WHERE p.last_seen > now() - interval '5 minutes') AS online_count
  FROM public.invites i
  JOIN public.servers s ON s.id = i.server_id
  WHERE i.code = p_code
    AND (i.expires_at IS NULL OR i.expires_at > now())
    AND (i.max_uses IS NULL OR i.use_count < i.max_uses)
  LIMIT 1;
$$;

-- Allow both anonymous (unauthenticated) and authenticated callers to invoke
-- this function so the invite landing page works for everyone.
GRANT EXECUTE ON FUNCTION public.get_server_preview_by_invite(text) TO anon, authenticated;
