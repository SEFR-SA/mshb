
-- Create friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  addressee_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Addressee can update friendship"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = addressee_id);

CREATE POLICY "Participants can delete friendship"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE TRIGGER update_friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create group_threads table
CREATE TABLE public.group_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_threads ENABLE ROW LEVEL SECURITY;

-- Create group_members table
CREATE TABLE public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.group_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check group membership
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id
  )
$$;

-- Security definer function to check group admin
CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE user_id = _user_id AND group_id = _group_id AND role = 'admin'
  )
$$;

-- RLS for group_threads
CREATE POLICY "Members can view group threads"
  ON public.group_threads FOR SELECT
  USING (public.is_group_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create groups"
  ON public.group_threads FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admin can update group"
  ON public.group_threads FOR UPDATE
  USING (public.is_group_admin(auth.uid(), id));

-- RLS for group_members
CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT
  USING (public.is_group_member(auth.uid(), group_id));

CREATE POLICY "Admin can add members"
  ON public.group_members FOR INSERT
  WITH CHECK (
    public.is_group_admin(auth.uid(), group_id)
    OR (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.group_threads WHERE id = group_id AND created_by = auth.uid()))
  );

CREATE POLICY "Admin can remove or self leave"
  ON public.group_members FOR DELETE
  USING (
    public.is_group_admin(auth.uid(), group_id)
    OR auth.uid() = user_id
  );

CREATE POLICY "Admin can update roles"
  ON public.group_members FOR UPDATE
  USING (public.is_group_admin(auth.uid(), group_id));

-- Add group_thread_id to messages
ALTER TABLE public.messages ADD COLUMN group_thread_id UUID REFERENCES public.group_threads(id);
ALTER TABLE public.messages ALTER COLUMN thread_id DROP NOT NULL;

-- Drop existing messages SELECT policy and recreate to include groups
DROP POLICY IF EXISTS "Thread participants can view messages" ON public.messages;
CREATE POLICY "Thread participants can view messages"
  ON public.messages FOR SELECT
  USING (
    (thread_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM dm_threads t
      WHERE t.id = messages.thread_id
      AND (t.user1_id = auth.uid() OR t.user2_id = auth.uid())
    ))
    OR
    (group_thread_id IS NOT NULL AND public.is_group_member(auth.uid(), group_thread_id))
  );

-- Drop existing messages INSERT policy and recreate
DROP POLICY IF EXISTS "Thread participants can insert messages" ON public.messages;
CREATE POLICY "Thread participants can insert messages"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = author_id
    AND (
      (thread_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM dm_threads t
        WHERE t.id = messages.thread_id
        AND (t.user1_id = auth.uid() OR t.user2_id = auth.uid())
      ))
      OR
      (group_thread_id IS NOT NULL AND public.is_group_member(auth.uid(), group_thread_id))
    )
  );

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;

-- Create thread_read_status for group threads (reuse existing table, group_thread_id nullable)
ALTER TABLE public.thread_read_status ALTER COLUMN thread_id DROP NOT NULL;
ALTER TABLE public.thread_read_status ADD COLUMN group_thread_id UUID REFERENCES public.group_threads(id);
