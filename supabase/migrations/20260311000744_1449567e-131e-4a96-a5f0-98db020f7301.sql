
-- Step 1: Add auto_renew and expires_at to user_boosts
ALTER TABLE public.user_boosts ADD COLUMN auto_renew boolean NOT NULL DEFAULT true;
ALTER TABLE public.user_boosts ADD COLUMN expires_at timestamptz;

-- Step 2: Add auto_renew to user_subscriptions
ALTER TABLE public.user_subscriptions ADD COLUMN auto_renew boolean NOT NULL DEFAULT true;

-- Step 3: Create transfer_boost RPC
CREATE OR REPLACE FUNCTION public.transfer_boost(p_boost_id uuid, p_new_server_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_boost record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify ownership and active status
  SELECT id, server_id, status, expires_at
  INTO v_boost
  FROM user_boosts
  WHERE id = p_boost_id
    AND user_id = v_user_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  FOR UPDATE;

  IF v_boost IS NULL THEN
    RAISE EXCEPTION 'Boost not found or not transferable';
  END IF;

  -- Verify user is a member of the new server
  IF NOT EXISTS (
    SELECT 1 FROM server_members
    WHERE user_id = v_user_id AND server_id = p_new_server_id
  ) THEN
    RAISE EXCEPTION 'Not a member of the target server';
  END IF;

  -- Transfer the boost (trigger handles old/new server recalculation)
  UPDATE user_boosts
  SET server_id = p_new_server_id
  WHERE id = p_boost_id;

  RETURN true;
END;
$$;

-- Step 4: Update recalculate_server_boost to exclude expired boosts
CREATE OR REPLACE FUNCTION public.recalculate_server_boost(p_server_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_old_count int;
  v_old_level int;
  v_new_count int;
  v_new_level int;
BEGIN
  SELECT boost_count, boost_level
    INTO v_old_count, v_old_level
    FROM public.servers
   WHERE id = p_server_id
     FOR UPDATE;

  -- Count active boosts that haven't expired
  SELECT COUNT(*)
    INTO v_new_count
    FROM public.user_boosts
   WHERE server_id = p_server_id
     AND status = 'active'
     AND (expires_at IS NULL OR expires_at > now());

  v_new_level := CASE
    WHEN v_new_count >= 14 THEN 3
    WHEN v_new_count >=  7 THEN 2
    WHEN v_new_count >=  2 THEN 1
    ELSE 0
  END;

  UPDATE public.servers
     SET boost_count = v_new_count,
         boost_level  = v_new_level
   WHERE id = p_server_id;

  UPDATE public.server_members sm
     SET is_booster = true,
         boosted_at  = COALESCE(
           sm.boosted_at,
           (SELECT MIN(ub.started_at)
              FROM public.user_boosts ub
             WHERE ub.user_id   = sm.user_id
               AND ub.server_id = p_server_id
               AND ub.status    = 'active'
               AND (ub.expires_at IS NULL OR ub.expires_at > now()))
         )
   WHERE sm.server_id    = p_server_id
     AND sm.is_booster   = false
     AND EXISTS (
           SELECT 1
             FROM public.user_boosts ub
            WHERE ub.user_id   = sm.user_id
              AND ub.server_id = p_server_id
              AND ub.status    = 'active'
              AND (ub.expires_at IS NULL OR ub.expires_at > now())
         );

  UPDATE public.server_members sm
     SET is_booster = false,
         boosted_at  = NULL
   WHERE sm.server_id  = p_server_id
     AND sm.is_booster = true
     AND NOT EXISTS (
           SELECT 1
             FROM public.user_boosts ub
            WHERE ub.user_id   = sm.user_id
              AND ub.server_id = p_server_id
              AND ub.status    = 'active'
              AND (ub.expires_at IS NULL OR ub.expires_at > now())
         );

  IF v_new_level <> v_old_level THEN
    PERFORM public.insert_boost_audit_log(
      p_server_id,
      (SELECT owner_id FROM public.servers WHERE id = p_server_id),
      'server_boost_level_changed',
      p_server_id,
      jsonb_build_object(
        'old_level',   v_old_level,
        'new_level',   v_new_level,
        'boost_count', v_new_count
      )
    );
  END IF;
END;
$$;

-- Step 5: Update sync_pro_status to also check canceling status as still active
CREATE OR REPLACE FUNCTION public.sync_pro_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_has_active boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND status IN ('active', 'canceling')
      AND (expires_at IS NULL OR expires_at > now())
  ) INTO v_has_active;

  UPDATE profiles
  SET is_pro = v_has_active
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;
