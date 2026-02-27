
-- Add description column to servers
ALTER TABLE public.servers ADD COLUMN description text DEFAULT '';

-- Allow owner to delete their server
CREATE POLICY "Owner can delete server"
ON public.servers FOR DELETE TO authenticated
USING (auth.uid() = owner_id);
