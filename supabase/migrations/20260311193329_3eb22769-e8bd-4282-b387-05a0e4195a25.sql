
-- 1. Ticket sequences per server
CREATE TABLE public.ticket_sequences (
  server_id UUID PRIMARY KEY,
  last_ticket_number INT NOT NULL DEFAULT 0
);
ALTER TABLE public.ticket_sequences ENABLE ROW LEVEL SECURITY;

-- RLS: server members can read
CREATE POLICY "Server members can view ticket sequences"
  ON public.ticket_sequences FOR SELECT
  USING (is_server_member(auth.uid(), server_id));

-- 2. Tickets metadata table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL,
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  support_channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open',
  ticket_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  closed_by UUID
);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- RLS: server members can read tickets for their server
CREATE POLICY "Server members can view tickets"
  ON public.tickets FOR SELECT
  USING (is_server_member(auth.uid(), server_id));

-- No direct INSERT/UPDATE/DELETE from clients (handled by RPCs)

-- 3. Add support_role_ids to channels
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS support_role_ids UUID[] DEFAULT '{}';

-- 4. RPC: create_ticket
CREATE OR REPLACE FUNCTION public.create_ticket(p_server_id UUID, p_support_channel_id UUID)
RETURNS TABLE(channel_id UUID, ticket_number INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_ticket_num INT;
  v_channel_id UUID;
  v_support_roles UUID[];
  v_category TEXT;
  v_username TEXT;
  v_role_user record;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify caller is a server member
  IF NOT is_server_member(v_user_id, p_server_id) THEN
    RAISE EXCEPTION 'Not a member of this server';
  END IF;

  -- Check if caller already has an open ticket for this support channel
  IF EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.owner_id = v_user_id
      AND t.support_channel_id = p_support_channel_id
      AND t.status = 'open'
  ) THEN
    RAISE EXCEPTION 'You already have an open ticket';
  END IF;

  -- Get support channel info
  SELECT c.support_role_ids, c.category INTO v_support_roles, v_category
  FROM public.channels c
  WHERE c.id = p_support_channel_id AND c.server_id = p_server_id AND c.type = 'support';

  IF v_category IS NULL THEN
    RAISE EXCEPTION 'Support channel not found';
  END IF;

  -- Atomically increment ticket sequence
  INSERT INTO public.ticket_sequences (server_id, last_ticket_number)
  VALUES (p_server_id, 1)
  ON CONFLICT (server_id) DO UPDATE
    SET last_ticket_number = ticket_sequences.last_ticket_number + 1
  RETURNING ticket_sequences.last_ticket_number INTO v_ticket_num;

  -- Create private ticket channel
  INSERT INTO public.channels (server_id, name, type, category, is_private, position)
  VALUES (p_server_id, 'ticket-' || lpad(v_ticket_num::text, 4, '0'), 'ticket', v_category, true, 9999)
  RETURNING id INTO v_channel_id;

  -- Add ticket owner as channel member
  INSERT INTO public.channel_members (channel_id, user_id)
  VALUES (v_channel_id, v_user_id);

  -- Add all users who have any of the support_role_ids
  IF array_length(v_support_roles, 1) > 0 THEN
    FOR v_role_user IN
      SELECT DISTINCT mr.user_id
      FROM public.member_roles mr
      WHERE mr.server_id = p_server_id
        AND mr.role_id = ANY(v_support_roles)
        AND mr.user_id != v_user_id
    LOOP
      INSERT INTO public.channel_members (channel_id, user_id)
      VALUES (v_channel_id, v_role_user.user_id)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Insert ticket record
  INSERT INTO public.tickets (server_id, channel_id, owner_id, support_channel_id, ticket_number)
  VALUES (p_server_id, v_channel_id, v_user_id, p_support_channel_id, v_ticket_num);

  -- Insert system message
  SELECT p.username INTO v_username FROM public.profiles p WHERE p.user_id = v_user_id;
  INSERT INTO public.messages (channel_id, author_id, content, type)
  VALUES (v_channel_id, v_user_id, 'Ticket created by @' || COALESCE(v_username, 'user'), 'system');

  RETURN QUERY SELECT v_channel_id, v_ticket_num;
END;
$$;

-- 5. RPC: close_ticket
CREATE OR REPLACE FUNCTION public.close_ticket(p_ticket_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_ticket record;
  v_username TEXT;
  v_support_roles UUID[];
  v_has_support_role BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get ticket info
  SELECT t.*, c.support_role_ids INTO v_ticket
  FROM public.tickets t
  JOIN public.channels c ON c.id = t.support_channel_id
  WHERE t.id = p_ticket_id AND t.status = 'open';

  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'Ticket not found or already closed';
  END IF;

  v_support_roles := v_ticket.support_role_ids;

  -- Check if caller is owner or has a support role
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

  -- Update ticket status
  UPDATE public.tickets
  SET status = 'closed', closed_at = now(), closed_by = v_user_id
  WHERE id = p_ticket_id;

  -- Rename channel
  UPDATE public.channels
  SET name = 'closed-' || lpad(v_ticket.ticket_number::text, 4, '0')
  WHERE id = v_ticket.channel_id;

  -- Insert system message
  SELECT p.username INTO v_username FROM public.profiles p WHERE p.user_id = v_user_id;
  INSERT INTO public.messages (channel_id, author_id, content, type)
  VALUES (v_ticket.channel_id, v_user_id, 'Ticket closed by @' || COALESCE(v_username, 'user'), 'system');
END;
$$;

-- 6. RPC: reopen_ticket (stub for Phase 3)
CREATE OR REPLACE FUNCTION public.reopen_ticket(p_ticket_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Not implemented yet';
END;
$$;
