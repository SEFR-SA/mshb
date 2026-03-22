
-- =============================================
-- SECURITY FIX #1: Remove direct INSERT on user_purchases
-- Only SECURITY DEFINER functions/triggers should insert purchases
-- =============================================
DROP POLICY IF EXISTS "user_purchases_own_insert" ON public.user_purchases;

-- =============================================
-- SECURITY FIX #2: Add entitlement check to user_equipped
-- Users can only equip items they have purchased
-- =============================================
DROP POLICY IF EXISTS "user_equipped_own_insert" ON public.user_equipped;
DROP POLICY IF EXISTS "user_equipped_own_update" ON public.user_equipped;

CREATE POLICY "user_equipped_own_insert" ON public.user_equipped
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_purchases up
      WHERE up.user_id = auth.uid() AND up.item_id = user_equipped.item_id
    )
  );

CREATE POLICY "user_equipped_own_update" ON public.user_equipped
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.user_purchases up
      WHERE up.user_id = auth.uid() AND up.item_id = user_equipped.item_id
    )
  );

-- =============================================
-- SECURITY FIX #3: Restrict notifications INSERT to self-notifications only
-- (SECURITY DEFINER triggers handle cross-user notifications)
-- =============================================
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert own notifications" ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.uid() = actor_id);

-- =============================================
-- SECURITY FIX #8: Create check_username_available RPC
-- Returns boolean only, no email leak
-- =============================================
CREATE OR REPLACE FUNCTION public.check_username_available(p_username text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(username) = lower(p_username)
  );
$$;

-- =============================================
-- SECURITY FIX #10: Require auth for custom_stickers SELECT
-- =============================================
DROP POLICY IF EXISTS "Anyone can view stickers" ON public.custom_stickers;

CREATE POLICY "Authenticated users can view stickers" ON public.custom_stickers
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- =============================================
-- SECURITY FIX #12: Fix mutable search_path on functions
-- =============================================
CREATE OR REPLACE FUNCTION public.trigger_welcome_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_enabled    boolean;
  v_channel_id uuid;
BEGIN
  SELECT welcome_message_enabled, system_message_channel_id
    INTO v_enabled, v_channel_id
    FROM public.servers
   WHERE id = NEW.server_id;

  IF v_enabled AND v_channel_id IS NOT NULL THEN
    INSERT INTO public.messages (author_id, channel_id, content, type)
    VALUES (NEW.user_id, v_channel_id, 'joined the server!', 'welcome');
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reopen_dm_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.thread_id IS NULL THEN RETURN NEW; END IF;

  UPDATE dm_thread_visibility
  SET is_visible = true, closed_at = NULL
  WHERE thread_id = NEW.thread_id
    AND is_visible = false;

  RETURN NEW;
END;
$function$;
