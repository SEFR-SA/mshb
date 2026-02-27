-- ─── member_roles linking table ──────────────────────────────────────────────
CREATE TABLE public.member_roles (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id   uuid        NOT NULL REFERENCES public.servers(id)      ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id)          ON DELETE CASCADE,
  role_id     uuid        NOT NULL REFERENCES public.server_roles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

ALTER TABLE public.member_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view member_roles"
  ON public.member_roles FOR SELECT
  USING (is_server_member(auth.uid(), server_id));

CREATE POLICY "Admins can assign roles"
  ON public.member_roles FOR INSERT
  WITH CHECK (is_server_admin(auth.uid(), server_id));

CREATE POLICY "Admins can remove roles"
  ON public.member_roles FOR DELETE
  USING (is_server_admin(auth.uid(), server_id));

-- ─── Welcome message trigger ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trigger_welcome_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
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
$$;

CREATE TRIGGER on_member_join_welcome
  AFTER INSERT ON public.server_members
  FOR EACH ROW EXECUTE FUNCTION public.trigger_welcome_message();
