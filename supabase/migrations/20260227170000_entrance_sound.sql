ALTER TABLE public.server_members
  ADD COLUMN entrance_sound_id uuid
    REFERENCES public.server_soundboard(id) ON DELETE SET NULL;

-- Allow members to update their own entrance sound
CREATE POLICY "Members can update own entrance sound"
  ON public.server_members FOR UPDATE
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
