
-- Pinned chats table
CREATE TABLE public.pinned_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_id uuid REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  group_thread_id uuid REFERENCES public.group_threads(id) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pinned_chats_one_target CHECK (
    (thread_id IS NOT NULL AND group_thread_id IS NULL) OR
    (thread_id IS NULL AND group_thread_id IS NOT NULL)
  ),
  UNIQUE(user_id, thread_id),
  UNIQUE(user_id, group_thread_id)
);

ALTER TABLE public.pinned_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pins" ON public.pinned_chats
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Call sessions table
CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  thread_id uuid REFERENCES public.dm_threads(id),
  status text NOT NULL DEFAULT 'ringing',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own calls" ON public.call_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users create calls" ON public.call_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users update own calls" ON public.call_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
