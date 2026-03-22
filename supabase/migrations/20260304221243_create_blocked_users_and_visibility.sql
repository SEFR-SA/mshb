
-- blocked_users
CREATE TABLE public.blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own blocks" ON public.blocked_users FOR SELECT USING (auth.uid() = blocker_id);
CREATE POLICY "Users can block others" ON public.blocked_users FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON public.blocked_users FOR DELETE USING (auth.uid() = blocker_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.blocked_users;

-- dm_thread_visibility
CREATE TABLE public.dm_thread_visibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_visible boolean NOT NULL DEFAULT true,
  closed_at timestamptz,
  UNIQUE (thread_id, user_id)
);
ALTER TABLE public.dm_thread_visibility ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own visibility" ON public.dm_thread_visibility FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own visibility" ON public.dm_thread_visibility FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own visibility" ON public.dm_thread_visibility FOR UPDATE USING (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_thread_visibility;
