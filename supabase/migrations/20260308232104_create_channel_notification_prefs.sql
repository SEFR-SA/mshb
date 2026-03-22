CREATE TABLE public.server_notification_prefs (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id uuid NOT NULL,
  level text NOT NULL DEFAULT 'all_messages',
  PRIMARY KEY (user_id, server_id)
);

ALTER TABLE public.server_notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own prefs" ON public.server_notification_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own prefs" ON public.server_notification_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prefs" ON public.server_notification_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prefs" ON public.server_notification_prefs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);