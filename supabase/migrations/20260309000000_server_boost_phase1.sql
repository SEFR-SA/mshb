-- ============================================================
-- Phase 1: Server Boost Database Foundation
-- ============================================================
-- Establishes the full schema, triggers, RPC functions, and RLS
-- policies for the Server Boost feature. All writes to user_boosts
-- are restricted to the Service Role (StreamPay webhook Edge Function).
-- Frontend users have SELECT-only access to their own boost records.
-- ============================================================


-- ============================================================
-- 1. user_boosts table
-- ============================================================

CREATE TABLE public.user_boosts (
  id                       uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id                uuid        REFERENCES public.servers(id) ON DELETE SET NULL,
  status                   text        NOT NULL DEFAULT 'active'
                                       CHECK (status IN ('active', 'canceled', 'past_due')),
  streampay_transaction_id text,
  started_at               timestamptz NOT NULL DEFAULT now(),
  canceled_at              timestamptz
);

CREATE INDEX idx_user_boosts_user_id   ON public.user_boosts(user_id);
CREATE INDEX idx_user_boosts_server_id ON public.user_boosts(server_id);
CREATE INDEX idx_user_boosts_status    ON public.user_boosts(status);


-- ============================================================
-- 2. Extend servers — boost aggregate columns
-- ============================================================

ALTER TABLE public.servers
  ADD COLUMN boost_count int NOT NULL DEFAULT 0,
  ADD COLUMN boost_level  int NOT NULL DEFAULT 0;


-- ============================================================
-- 3. Extend server_members — booster tracking columns
-- ============================================================

ALTER TABLE public.server_members
  ADD COLUMN is_booster boolean     NOT NULL DEFAULT false,
  ADD COLUMN boosted_at timestamptz;


-- ============================================================
-- 4. Row Level Security for user_boosts
-- ============================================================

ALTER TABLE public.user_boosts ENABLE ROW LEVEL SECURITY;

-- Users can read their own boost records
CREATE POLICY "Users can view own boosts"
  ON public.user_boosts FOR SELECT
  USING (auth.uid() = user_id);

-- Server admins can read all boosts assigned to their server
CREATE POLICY "Server admins can view server boosts"
  ON public.user_boosts FOR SELECT
  USING (
    server_id IS NOT NULL
    AND public.is_server_admin(auth.uid(), server_id)
  );

-- NOTE: No INSERT or UPDATE policy for authenticated users.
-- All writes to user_boosts are strictly performed by the StreamPay
-- webhook Edge Function using the SUPABASE_SERVICE_ROLE_KEY, which
-- bypasses RLS entirely. This prevents free-boost privilege escalation
-- via direct client-side Supabase calls.


-- ============================================================
-- 5. SECURITY DEFINER audit helper
--    Bypasses the existing "admin-only" INSERT policy on
--    server_audit_logs so that trigger functions (which run
--    without an auth.uid() session) can still write audit entries.
-- ============================================================

CREATE OR REPLACE FUNCTION public.insert_boost_audit_log(
  p_server_id uuid,
  p_actor_id  uuid,
  p_action    text,
  p_target_id uuid,
  p_changes   jsonb
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.server_audit_logs
    (server_id, actor_id, action_type, target_id, changes)
  VALUES
    (p_server_id, p_actor_id, p_action, p_target_id, p_changes);
END;
$$;


-- ============================================================
-- 6. Core calculation function
--    Recalculates boost_count + boost_level for a server and
--    syncs is_booster on server_members. Uses SELECT ... FOR UPDATE
--    to serialize concurrent boost events on the same server.
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalculate_server_boost(p_server_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_old_count int;
  v_old_level int;
  v_new_count int;
  v_new_level int;
BEGIN
  -- Concurrency protection: lock the server row for the duration of
  -- this transaction so simultaneous boosts cannot produce a stale count.
  SELECT boost_count, boost_level
    INTO v_old_count, v_old_level
    FROM public.servers
   WHERE id = p_server_id
     FOR UPDATE;

  -- Count all active boosts assigned to this server
  SELECT COUNT(*)
    INTO v_new_count
    FROM public.user_boosts
   WHERE server_id = p_server_id
     AND status = 'active';

  -- Level thresholds (Discord-inspired):
  --   0–1   boosts → Level 0
  --   2–6   boosts → Level 1
  --   7–13  boosts → Level 2
  --   14+   boosts → Level 3
  v_new_level := CASE
    WHEN v_new_count >= 14 THEN 3
    WHEN v_new_count >=  7 THEN 2
    WHEN v_new_count >=  2 THEN 1
    ELSE 0
  END;

  -- Persist the updated aggregate on the server row
  UPDATE public.servers
     SET boost_count = v_new_count,
         boost_level  = v_new_level
   WHERE id = p_server_id;

  -- Set is_booster = true for members who now have an active boost
  -- COALESCE preserves the original boosted_at if the member already
  -- had a prior boost (e.g., they bought a second boost slot).
  UPDATE public.server_members sm
     SET is_booster = true,
         boosted_at  = COALESCE(
           sm.boosted_at,
           (SELECT MIN(ub.started_at)
              FROM public.user_boosts ub
             WHERE ub.user_id   = sm.user_id
               AND ub.server_id = p_server_id
               AND ub.status    = 'active')
         )
   WHERE sm.server_id    = p_server_id
     AND sm.is_booster   = false
     AND EXISTS (
           SELECT 1
             FROM public.user_boosts ub
            WHERE ub.user_id   = sm.user_id
              AND ub.server_id = p_server_id
              AND ub.status    = 'active'
         );

  -- Clear is_booster for members who no longer have any active boost
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
         );

  -- Audit: log the level change as a system event.
  -- Uses the server owner as actor_id — the only guaranteed valid
  -- auth.users FK available inside a trigger (no session context).
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


-- ============================================================
-- 7. Trigger function
--    Fires after INSERT or UPDATE on user_boosts. Logs boost
--    lifecycle events to server_audit_logs and calls
--    recalculate_server_boost for any affected server(s).
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_boost_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  -- Audit: new boost record created
  IF TG_OP = 'INSERT' AND NEW.server_id IS NOT NULL THEN
    PERFORM public.insert_boost_audit_log(
      NEW.server_id,
      NEW.user_id,
      'server_boost_started',
      NEW.id,
      jsonb_build_object(
        'status',                   NEW.status,
        'streampay_transaction_id', NEW.streampay_transaction_id
      )
    );
  END IF;

  -- Audit: boost status changed (e.g., active → canceled)
  IF TG_OP = 'UPDATE' AND OLD.status <> NEW.status AND NEW.server_id IS NOT NULL THEN
    PERFORM public.insert_boost_audit_log(
      NEW.server_id,
      NEW.user_id,
      'server_boost_status_changed',
      NEW.id,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;

  -- If the boost was reassigned to a different server, recalculate
  -- the OLD server first so its count is decremented correctly.
  IF TG_OP = 'UPDATE'
     AND OLD.server_id IS DISTINCT FROM NEW.server_id
     AND OLD.server_id IS NOT NULL THEN
    PERFORM public.recalculate_server_boost(OLD.server_id);
  END IF;

  -- Recalculate the current (new) server
  IF NEW.server_id IS NOT NULL THEN
    PERFORM public.recalculate_server_boost(NEW.server_id);
  END IF;

  RETURN NEW;
END;
$$;


-- ============================================================
-- 8. Attach trigger to user_boosts
-- ============================================================

CREATE TRIGGER on_boost_change
  AFTER INSERT OR UPDATE OF status, server_id
  ON public.user_boosts
  FOR EACH ROW EXECUTE FUNCTION public.handle_boost_change();


-- ============================================================
-- 9. Enable Realtime for user_boosts
--    Allows the frontend to subscribe to boost status changes
--    (e.g., to refresh the boost count badge in real time).
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_boosts;
