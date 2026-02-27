-- Create server_roles table for custom server role management
CREATE TABLE public.server_roles (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id   uuid        NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name        text        NOT NULL DEFAULT 'New Role',
  color       text        NOT NULL DEFAULT '#99aab5',
  icon_url    text,
  permissions jsonb       NOT NULL DEFAULT '{}',
  position    integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.server_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Server members can view roles"
  ON public.server_roles FOR SELECT
  USING (is_server_member(auth.uid(), server_id));

CREATE POLICY "Admins can insert roles"
  ON public.server_roles FOR INSERT
  WITH CHECK (is_server_admin(auth.uid(), server_id));

CREATE POLICY "Admins can update roles"
  ON public.server_roles FOR UPDATE
  USING (is_server_admin(auth.uid(), server_id));

CREATE POLICY "Admins can delete roles"
  ON public.server_roles FOR DELETE
  USING (is_server_admin(auth.uid(), server_id));
