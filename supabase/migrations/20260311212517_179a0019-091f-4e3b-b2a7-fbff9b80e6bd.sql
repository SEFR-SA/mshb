
-- Step 1: Add community columns to servers
ALTER TABLE public.servers
  ADD COLUMN is_community BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN rules_channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  ADD COLUMN public_updates_channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;

-- Step 2: enable_community RPC
CREATE OR REPLACE FUNCTION public.enable_community(
  p_server_id UUID,
  p_rules_channel_id UUID DEFAULT NULL,
  p_updates_channel_id UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner_id UUID;
  v_rules_id UUID := p_rules_channel_id;
  v_updates_id UUID := p_updates_channel_id;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT owner_id INTO v_owner_id FROM public.servers WHERE id = p_server_id;
  IF v_owner_id IS NULL OR v_owner_id <> v_user_id THEN
    RAISE EXCEPTION 'Only the server owner can enable community';
  END IF;

  -- Create rules channel if not provided
  IF v_rules_id IS NULL THEN
    INSERT INTO public.channels (server_id, name, type, is_rules, category, position)
    VALUES (p_server_id, 'rules', 'text', true, 'Text Channels', 0)
    RETURNING id INTO v_rules_id;
  END IF;

  -- Create announcements channel if not provided
  IF v_updates_id IS NULL THEN
    INSERT INTO public.channels (server_id, name, type, is_announcement, category, position)
    VALUES (p_server_id, 'announcements', 'text', true, 'Text Channels', 1)
    RETURNING id INTO v_updates_id;
  END IF;

  UPDATE public.servers
  SET is_community = true,
      rules_channel_id = v_rules_id,
      public_updates_channel_id = v_updates_id
  WHERE id = p_server_id;

  -- Audit log
  INSERT INTO public.server_audit_logs (server_id, actor_id, action_type, changes)
  VALUES (p_server_id, v_user_id, 'community_enabled',
    jsonb_build_object('rules_channel_id', v_rules_id, 'updates_channel_id', v_updates_id));
END;
$$;

-- Step 3: disable_community RPC
CREATE OR REPLACE FUNCTION public.disable_community(p_server_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner_id UUID;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT owner_id INTO v_owner_id FROM public.servers WHERE id = p_server_id;
  IF v_owner_id IS NULL OR v_owner_id <> v_user_id THEN
    RAISE EXCEPTION 'Only the server owner can disable community';
  END IF;

  UPDATE public.servers SET is_community = false WHERE id = p_server_id;

  INSERT INTO public.server_audit_logs (server_id, actor_id, action_type)
  VALUES (p_server_id, v_user_id, 'community_disabled');
END;
$$;
