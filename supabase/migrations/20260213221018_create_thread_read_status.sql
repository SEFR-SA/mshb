
CREATE TABLE public.thread_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, thread_id)
);

ALTER TABLE public.thread_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own read status" ON public.thread_read_status FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own read status" ON public.thread_read_status FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own read status" ON public.thread_read_status FOR UPDATE USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.thread_read_status;
