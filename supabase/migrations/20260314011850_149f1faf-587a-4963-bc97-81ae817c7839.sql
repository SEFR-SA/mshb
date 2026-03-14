
-- Fix existing short usernames before adding constraint
UPDATE public.profiles SET username = NULL WHERE username IS NOT NULL AND length(username) < 3;

-- Add CHECK constraint for minimum 3 characters
ALTER TABLE public.profiles
ADD CONSTRAINT username_min_length CHECK (username IS NULL OR length(username) >= 3);

-- Create change_username RPC
CREATE OR REPLACE FUNCTION public.change_username(p_new_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_last_changed timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  IF length(trim(p_new_username)) < 3 THEN
    RETURN jsonb_build_object('error', 'too_short');
  END IF;

  SELECT username_changed_at INTO v_last_changed
  FROM profiles WHERE user_id = v_user_id;

  IF v_last_changed IS NOT NULL AND v_last_changed > now() - interval '6 months' THEN
    RETURN jsonb_build_object('error', 'cooldown', 'next_change_at', (v_last_changed + interval '6 months')::text);
  END IF;

  IF EXISTS (SELECT 1 FROM profiles WHERE lower(username) = lower(trim(p_new_username)) AND user_id <> v_user_id) THEN
    RETURN jsonb_build_object('error', 'taken');
  END IF;

  UPDATE profiles
  SET username = lower(trim(p_new_username)),
      username_changed_at = now()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
