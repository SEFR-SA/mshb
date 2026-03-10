
-- 1. Create user_subscriptions table
CREATE TABLE public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tier text NOT NULL DEFAULT 'pro',
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  streampay_transaction_id text
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only SELECT their own rows
CREATE POLICY "Users can view own subscriptions"
  ON public.user_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;

-- 2. Create apply_inventory_boost RPC
CREATE OR REPLACE FUNCTION public.apply_inventory_boost(p_server_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_boost_id uuid;
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify user is a member of the target server
  IF NOT EXISTS (
    SELECT 1 FROM server_members
    WHERE user_id = v_user_id AND server_id = p_server_id
  ) THEN
    RAISE EXCEPTION 'Not a member of this server';
  END IF;

  -- Find one unassigned active boost
  SELECT id INTO v_boost_id
  FROM user_boosts
  WHERE user_id = v_user_id
    AND server_id IS NULL
    AND status = 'active'
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_boost_id IS NULL THEN
    RETURN false;
  END IF;

  -- Assign it to the server
  UPDATE user_boosts
  SET server_id = p_server_id
  WHERE id = v_boost_id;

  RETURN true;
END;
$$;

-- 3. Trigger to sync profiles.is_pro from user_subscriptions
CREATE OR REPLACE FUNCTION public.sync_pro_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_active boolean;
BEGIN
  -- Check if user still has any active subscription
  SELECT EXISTS (
    SELECT 1 FROM user_subscriptions
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
      AND status = 'active'
  ) INTO v_has_active;

  UPDATE profiles
  SET is_pro = v_has_active
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER on_subscription_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_pro_status();
