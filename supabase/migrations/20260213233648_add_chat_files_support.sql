
-- Create chat-files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true);

-- Storage RLS policies
CREATE POLICY "Auth users can upload chat files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view chat files" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'chat-files');

CREATE POLICY "Users can delete own chat files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Add file columns to messages
ALTER TABLE public.messages
  ADD COLUMN file_url text,
  ADD COLUMN file_name text,
  ADD COLUMN file_type text,
  ADD COLUMN file_size integer;
