
-- Create custom_stickers table
CREATE TABLE public.custom_stickers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'custom',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.custom_stickers ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all stickers
CREATE POLICY "Anyone can view stickers"
ON public.custom_stickers FOR SELECT
USING (true);

-- Users can insert their own stickers
CREATE POLICY "Users can insert own stickers"
ON public.custom_stickers FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own stickers
CREATE POLICY "Users can delete own stickers"
ON public.custom_stickers FOR DELETE
USING (auth.uid() = user_id);

-- Create stickers storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('stickers', 'stickers', true);

-- Storage policies for stickers bucket
CREATE POLICY "Anyone can view stickers files"
ON storage.objects FOR SELECT
USING (bucket_id = 'stickers');

CREATE POLICY "Authenticated users can upload stickers"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stickers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own stickers files"
ON storage.objects FOR DELETE
USING (bucket_id = 'stickers' AND auth.uid()::text = (storage.foldername(name))[1]);
