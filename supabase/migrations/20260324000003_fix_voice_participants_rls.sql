-- Add direct self-select policy so Realtime auth context can always pass without a join.
-- The existing "Server members can view voice participants" policy requires is_server_member()
-- which does a join and may behave differently in Supabase Realtime's auth context.
-- Postgres ORs multiple permissive policies — if either passes, the subscriber sees the event.
CREATE POLICY "Users can view their own voice participant row"
ON public.voice_channel_participants FOR SELECT
USING (auth.uid() = user_id);
