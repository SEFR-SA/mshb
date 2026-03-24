DROP FUNCTION IF EXISTS public.move_voice_user(uuid, uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.move_voice_user(
  p_from_channel_id uuid,
  p_user_id         uuid,
  p_to_channel_id   uuid,
  p_to_channel_name text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_server_id uuid;
  v_updated   jsonb;
BEGIN
  SELECT server_id INTO v_server_id FROM channels WHERE id = p_from_channel_id;
  IF v_server_id IS NULL THEN RAISE EXCEPTION 'Channel not found'; END IF;
  IF NOT has_role_permission(auth.uid(), v_server_id, 'move_members') THEN
    RAISE EXCEPTION 'Insufficient permissions to move members';
  END IF;

  UPDATE public.voice_channel_participants
  SET
    pending_move_channel_id   = p_to_channel_id::text,
    pending_move_channel_name = p_to_channel_name
  WHERE channel_id = p_from_channel_id
    AND user_id    = p_user_id
  RETURNING to_jsonb(voice_channel_participants.*) INTO v_updated;

  IF v_updated IS NULL THEN
    RAISE EXCEPTION 'No participant row found for user % in channel %', p_user_id, p_from_channel_id;
  END IF;

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_voice_user TO authenticated;
