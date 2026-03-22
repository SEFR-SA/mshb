ALTER TABLE public.notifications DROP CONSTRAINT notifications_actor_id_fkey;
ALTER TABLE public.notifications
ADD CONSTRAINT notifications_actor_id_fkey
FOREIGN KEY (actor_id) REFERENCES public.profiles(user_id) ON DELETE SET NULL;