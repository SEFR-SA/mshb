CREATE TABLE public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  os text NOT NULL DEFAULT 'Unknown',
  browser text NOT NULL DEFAULT 'Unknown',
  ip_address text,
  location text,
  last_active timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices"
  ON public.user_devices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own devices"
  ON public.user_devices FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
  ON public.user_devices FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
  ON public.user_devices FOR DELETE TO authenticated
  USING (auth.uid() = user_id);