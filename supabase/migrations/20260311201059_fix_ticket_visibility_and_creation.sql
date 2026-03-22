-- Fix Bug 2: tighten channel visibility for private channels
DROP POLICY IF EXISTS "Members can view channels" ON public.channels;
CREATE POLICY "Members can view channels"
ON public.channels
FOR SELECT
USING (
  (
    is_server_member(auth.uid(), server_id)
    OR EXISTS (
      SELECT 1
      FROM public.servers s
      WHERE s.id = channels.server_id
        AND s.owner_id = auth.uid()
    )
  )
  AND (
    is_private = false
    OR is_channel_member(auth.uid(), id)
    OR is_server_admin(auth.uid(), server_id)
    OR EXISTS (
      SELECT 1
      FROM public.servers s
      WHERE s.id = channels.server_id
        AND s.owner_id = auth.uid()
    )
  )
);

-- Fix Bugs 1 & 3: recreate ticket RPCs with owner access + proper system messages
CREATE OR REPLACE FUNCTION public.create_ticket(p_server_id uuid, p_support_channel_id uuid)
RETURNS TABLE(channel_id uuid, ticket_number integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_ticket_num INT;
  v_channel_id UUID;
  v_support_roles UUID[];
  v_category TEXT;
  v_display_name TEXT;
  v_role_user record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT is_server_member(v_user_id, p_server_id) THEN
    RAISE EXCEPTION 'Not a member of this server';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.owner_id = v_user_id
      AND t.support_channel_id = p_support_channel_id
      AND t.status = 'open'
  ) THEN
    RAISE EXCEPTION 'You already have an open ticket';
  END IF;

  SELECT c.support_role_ids, c.category
    INTO v_support_roles, v_category
  FROM public.channels c
  WHERE c.id = p_support_channel_id
    AND c.server_id = p_server_id
    AND c.type = 'support';

  IF v_category IS NULL THEN
    RAISE EXCEPTION 'Support channel not found';
  END IF;

  INSERT INTO public.ticket_sequences (server_id, last_ticket_number)
  VALUES (p_server_id, 1)
  ON CONFLICT (server_id) DO UPDATE
    SET last_ticket_number = ticket_sequences.last_ticket_number + 1
  RETURNING ticket_sequences.last_ticket_number INTO v_ticket_num;

  INSERT INTO public.channels (server_id, name, type, category, is_private, position)
  VALUES (p_server_id, 'ticket-' || lpad(v_ticket_num::text, 4, '0'), 'ticket', v_category, true, 9999)
  RETURNING id INTO v_channel_id;

  INSERT INTO public.channel_members (channel_id, user_id)
  VALUES (v_channel_id, v_user_id)
  ON CONFLICT DO NOTHING;

  IF array_length(v_support_roles, 1) > 0 THEN
    FOR v_role_user IN
      SELECT DISTINCT mr.user_id
      FROM public.member_roles mr
      WHERE mr.server_id = p_server_id
        AND mr.role_id = ANY(v_support_roles)
        AND mr.user_id <> v_user_id
    LOOP
      INSERT INTO public.channel_members (channel_id, user_id)
      VALUES (v_channel_id, v_role_user.user_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Ensure server owner always has access to ticket channel
  INSERT INTO public.channel_members (channel_id, user_id)
  SELECT v_channel_id, s.owner_id
  FROM public.servers s
  WHERE s.id = p_server_id
  ON CONFLICT DO NOTHING;

  INSERT INTO public.tickets (server_id, channel_id, owner_id, support_channel_id, ticket_number)
  VALUES (p_server_id, v_channel_id, v_user_id, p_support_channel_id, v_ticket_num);

  SELECT COALESCE(NULLIF(trim(p.display_name), ''), NULLIF(trim(p.username), ''), 'user')
    INTO v_display_name
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  INSERT INTO public.messages (channel_id, author_id, content, type)
  VALUES (v_channel_id, v_user_id, 'Ticket opened by ' || COALESCE(v_display_name, 'user'), 'system');

  RETURN QUERY SELECT v_channel_id, v_ticket_num;
END;
$function$;

CREATE OR REPLACE FUNCTION public.close_ticket(p_ticket_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_ticket record;
  v_display_name TEXT;
  v_support_roles UUID[];
  v_has_support_role BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT t.*, c.support_role_ids INTO v_ticket
  FROM public.tickets t
  JOIN public.channels c ON c.id = t.support_channel_id
  WHERE t.id = p_ticket_id AND t.status = 'open';

  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'Ticket not found or already closed';
  END IF;

  v_support_roles := v_ticket.support_role_ids;

  IF v_user_id != v_ticket.owner_id THEN
    IF array_length(v_support_roles, 1) > 0 THEN
      SELECT EXISTS (
        SELECT 1 FROM public.member_roles mr
        WHERE mr.user_id = v_user_id
          AND mr.server_id = v_ticket.server_id
          AND mr.role_id = ANY(v_support_roles)
      ) INTO v_has_support_role;
    END IF;

    IF NOT v_has_support_role AND NOT is_server_admin(v_user_id, v_ticket.server_id) THEN
      RAISE EXCEPTION 'Not authorized to close this ticket';
    END IF;
  END IF;

  UPDATE public.tickets
  SET status = 'closed', closed_at = now(), closed_by = v_user_id
  WHERE id = p_ticket_id;

  UPDATE public.channels
  SET name = 'closed-' || lpad(v_ticket.ticket_number::text, 4, '0')
  WHERE id = v_ticket.channel_id;

  SELECT COALESCE(NULLIF(trim(p.display_name), ''), NULLIF(trim(p.username), ''), 'user')
    INTO v_display_name
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  INSERT INTO public.messages (channel_id, author_id, content, type)
  VALUES (v_ticket.channel_id, v_user_id, 'Ticket closed by ' || COALESCE(v_display_name, 'user'), 'system');
END;
$function$;

CREATE OR REPLACE FUNCTION public.reopen_ticket(p_ticket_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_ticket record;
  v_display_name TEXT;
  v_support_roles UUID[];
  v_has_support_role BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT t.*, c.support_role_ids INTO v_ticket
  FROM public.tickets t
  JOIN public.channels c ON c.id = t.support_channel_id
  WHERE t.id = p_ticket_id AND t.status = 'closed';

  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'Ticket not found or already open';
  END IF;

  v_support_roles := v_ticket.support_role_ids;

  IF v_user_id != v_ticket.owner_id THEN
    IF array_length(v_support_roles, 1) > 0 THEN
      SELECT EXISTS (
        SELECT 1 FROM public.member_roles mr
        WHERE mr.user_id = v_user_id
          AND mr.server_id = v_ticket.server_id
          AND mr.role_id = ANY(v_support_roles)
      ) INTO v_has_support_role;
    END IF;
    IF NOT v_has_support_role AND NOT is_server_admin(v_user_id, v_ticket.server_id) THEN
      RAISE EXCEPTION 'Not authorized to reopen this ticket';
    END IF;
  END IF;

  UPDATE public.tickets
  SET status = 'open', closed_at = NULL, closed_by = NULL
  WHERE id = p_ticket_id;

  UPDATE public.channels
  SET name = 'ticket-' || lpad(v_ticket.ticket_number::text, 4, '0')
  WHERE id = v_ticket.channel_id;

  INSERT INTO public.channel_members (channel_id, user_id)
  VALUES (v_ticket.channel_id, v_ticket.owner_id)
  ON CONFLICT DO NOTHING;

  SELECT COALESCE(NULLIF(trim(p.display_name), ''), NULLIF(trim(p.username), ''), 'user')
    INTO v_display_name
  FROM public.profiles p
  WHERE p.user_id = v_user_id;

  INSERT INTO public.messages (channel_id, author_id, content, type)
  VALUES (v_ticket.channel_id, v_user_id, 'Ticket reopened by ' || COALESCE(v_display_name, 'user'), 'system');
END;
$function$;