-- Add pending move columns to voice_channel_participants
ALTER TABLE public.voice_channel_participants
  ADD COLUMN IF NOT EXISTS pending_move_channel_id   TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pending_move_channel_name TEXT DEFAULT NULL;

-- RPC: move a voice participant to another channel
-- Sets pending columns on the target user's row; Supabase Realtime propagates to their client,
-- which picks it up in the existing voice-mod-self subscription and calls setVoiceChannel().
CREATE OR REPLACE FUNCTION public.move_voice_user(
  p_from_channel_id uuid,
  p_user_id         uuid,
  p_to_channel_id   uuid,
  p_to_channel_name text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_server_id uuid;
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
    AND user_id    = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.move_voice_user TO authenticated;
