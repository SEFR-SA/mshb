CREATE TABLE IF NOT EXISTS public.server_audit_logs (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id   uuid        NOT NULL,
  actor_id    uuid        NOT NULL,
  action_type text        NOT NULL,
  target_id   uuid,
  changes     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.server_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
ON public.server_audit_logs FOR SELECT
USING (public.is_server_admin(auth.uid(), server_id));

CREATE POLICY "Admins can insert audit logs"
ON public.server_audit_logs FOR INSERT
WITH CHECK (
  auth.uid() = actor_id
  AND public.is_server_admin(auth.uid(), server_id)
);