
-- Fix group_threads policies (recreate as PERMISSIVE)
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.group_threads;
CREATE POLICY "Authenticated users can create groups"
  ON public.group_threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Members can view group threads" ON public.group_threads;
CREATE POLICY "Members can view group threads"
  ON public.group_threads FOR SELECT
  TO authenticated
  USING (is_group_member(auth.uid(), id));

DROP POLICY IF EXISTS "Admin can update group" ON public.group_threads;
CREATE POLICY "Admin can update group"
  ON public.group_threads FOR UPDATE
  TO authenticated
  USING (is_group_admin(auth.uid(), id));

-- Fix group_members policies (recreate as PERMISSIVE)
DROP POLICY IF EXISTS "Admin can add members" ON public.group_members;
CREATE POLICY "Admin can add members"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    is_group_admin(auth.uid(), group_id)
    OR (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM group_threads
        WHERE group_threads.id = group_members.group_id
          AND group_threads.created_by = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (is_group_member(auth.uid(), group_id));

DROP POLICY IF EXISTS "Admin can update roles" ON public.group_members;
CREATE POLICY "Admin can update roles"
  ON public.group_members FOR UPDATE
  TO authenticated
  USING (is_group_admin(auth.uid(), group_id));

DROP POLICY IF EXISTS "Admin can remove or self leave" ON public.group_members;
CREATE POLICY "Admin can remove or self leave"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (is_group_admin(auth.uid(), group_id) OR auth.uid() = user_id);
