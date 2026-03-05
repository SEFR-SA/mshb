
-- 1a: Create message_reports table
CREATE TABLE public.message_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  category text NOT NULL,
  subcategories text[] DEFAULT '{}',
  notes text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.message_reports ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own reports
CREATE POLICY "Users can submit reports"
  ON public.message_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- 1b: Add is_pinned column to messages
ALTER TABLE public.messages ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;

-- 1c: Security definer function for toggling pin
CREATE OR REPLACE FUNCTION public.toggle_message_pin(p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_msg messages;
  v_new_val boolean;
BEGIN
  SELECT * INTO v_msg FROM messages WHERE id = p_message_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found'; END IF;

  -- Check caller is participant of the DM thread / group / server channel
  IF v_msg.thread_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM dm_threads
      WHERE id = v_msg.thread_id
        AND (user1_id = auth.uid() OR user2_id = auth.uid())
    ) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  ELSIF v_msg.group_thread_id IS NOT NULL THEN
    IF NOT is_group_member(auth.uid(), v_msg.group_thread_id) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  ELSIF v_msg.channel_id IS NOT NULL THEN
    IF NOT is_server_member(auth.uid(), (
      SELECT server_id FROM channels WHERE id = v_msg.channel_id
    )) THEN
      RAISE EXCEPTION 'Not authorized';
    END IF;
  ELSE
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_new_val := NOT COALESCE(v_msg.is_pinned, false);
  UPDATE messages SET is_pinned = v_new_val WHERE id = p_message_id;
  RETURN v_new_val;
END;
$$;
