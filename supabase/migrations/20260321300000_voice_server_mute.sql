-- Add server_muted and server_deafened columns to voice_channel_participants
ALTER TABLE public.voice_channel_participants
  ADD COLUMN IF NOT EXISTS server_muted    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS server_deafened BOOLEAN NOT NULL DEFAULT false;

-- RPC: moderate a voice participant (server mute / server deafen)
-- Caller must have mute_members (for server_muted) or deafen_members (for server_deafened).
-- SECURITY DEFINER so the UPDATE bypasses the RLS policy that only allows the row owner to modify their own row.
CREATE OR REPLACE FUNCTION public.server_moderate_voice_user(
  p_channel_id     uuid,
  p_user_id        uuid,
  p_server_muted   boolean DEFAULT NULL,
  p_server_deafened boolean DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_server_id uuid;
BEGIN
  SELECT server_id INTO v_server_id FROM channels WHERE id = p_channel_id;

  IF v_server_id IS NULL THEN
    RAISE EXCEPTION 'Channel not found';
  END IF;

  IF p_server_muted IS NOT NULL THEN
    IF NOT has_role_permission(auth.uid(), v_server_id, 'mute_members') THEN
      RAISE EXCEPTION 'Insufficient permissions to server mute';
    END IF;
  END IF;

  IF p_server_deafened IS NOT NULL THEN
    IF NOT has_role_permission(auth.uid(), v_server_id, 'deafen_members') THEN
      RAISE EXCEPTION 'Insufficient permissions to server deafen';
    END IF;
  END IF;

  UPDATE public.voice_channel_participants
  SET
    server_muted     = COALESCE(p_server_muted,    server_muted),
    server_deafened  = COALESCE(p_server_deafened, server_deafened)
  WHERE channel_id = p_channel_id
    AND user_id    = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.server_moderate_voice_user TO authenticated;
