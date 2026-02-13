DROP POLICY IF EXISTS "Members can view group threads" ON public.group_threads;
CREATE POLICY "Members can view group threads"
  ON public.group_threads FOR SELECT
  TO authenticated
  USING (is_group_member(auth.uid(), id) OR created_by = auth.uid());