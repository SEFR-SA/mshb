
DROP POLICY IF EXISTS "Users can insert notifications as actors" ON public.notifications;

CREATE POLICY "Users can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = actor_id OR auth.uid() = user_id);
