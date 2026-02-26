DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.server_audit_logs;
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.server_audit_logs;

CREATE POLICY "Admins can read audit logs"
ON public.server_audit_logs FOR SELECT TO authenticated
USING (is_server_admin(auth.uid(), server_id));

CREATE POLICY "Admins can insert audit logs"
ON public.server_audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = actor_id AND is_server_admin(auth.uid(), server_id));