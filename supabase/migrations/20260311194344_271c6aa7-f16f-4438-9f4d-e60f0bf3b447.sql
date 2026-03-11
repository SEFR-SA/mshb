
-- Add transcript_url to tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS transcript_url TEXT;

-- Create storage bucket for transcripts
INSERT INTO storage.buckets (id, name, public)
VALUES ('ticket_transcripts', 'ticket_transcripts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can read transcripts
CREATE POLICY "Public read transcripts" ON storage.objects FOR SELECT USING (bucket_id = 'ticket_transcripts');

-- Enable realtime for tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

-- Replace reopen_ticket stub with real implementation
CREATE OR REPLACE FUNCTION public.reopen_ticket(p_ticket_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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

  SELECT p.username INTO v_username FROM public.profiles p WHERE p.user_id = v_user_id;
  INSERT INTO public.messages (channel_id, author_id, content, type)
  VALUES (v_ticket.channel_id, v_user_id, 'Ticket reopened by @' || COALESCE(v_username, 'user'), 'system');
END;
$function$;

-- New delete_ticket RPC
CREATE OR REPLACE FUNCTION public.delete_ticket(p_ticket_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_ticket record;
  v_support_roles UUID[];
  v_has_support_role BOOLEAN := false;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT t.*, c.support_role_ids INTO v_ticket
  FROM public.tickets t
  JOIN public.channels c ON c.id = t.support_channel_id
  WHERE t.id = p_ticket_id;

  IF v_ticket IS NULL THEN
    RAISE EXCEPTION 'Ticket not found';
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
      RAISE EXCEPTION 'Not authorized to delete this ticket';
    END IF;
  END IF;

  DELETE FROM public.messages WHERE channel_id = v_ticket.channel_id;
  DELETE FROM public.channel_members WHERE channel_id = v_ticket.channel_id;
  DELETE FROM public.channels WHERE id = v_ticket.channel_id;
  DELETE FROM public.tickets WHERE id = p_ticket_id;
END;
$function$;

-- Auto-cleanup function (called by edge function on a schedule)
CREATE OR REPLACE FUNCTION public.cleanup_closed_tickets()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_count integer;
  v_ticket record;
BEGIN
  v_count := 0;
  FOR v_ticket IN
    SELECT id, channel_id FROM public.tickets
    WHERE status = 'closed' AND closed_at < now() - interval '24 hours'
  LOOP
    DELETE FROM public.messages WHERE channel_id = v_ticket.channel_id;
    DELETE FROM public.channel_members WHERE channel_id = v_ticket.channel_id;
    DELETE FROM public.channels WHERE id = v_ticket.channel_id;
    DELETE FROM public.tickets WHERE id = v_ticket.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;
