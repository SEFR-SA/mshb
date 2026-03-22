
-- Server Folders table
CREATE TABLE public.server_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Folder',
  color TEXT NOT NULL DEFAULT '#5865F2',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.server_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folders" ON public.server_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own folders" ON public.server_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own folders" ON public.server_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own folders" ON public.server_folders FOR DELETE USING (auth.uid() = user_id);

-- Server Folder Items table
CREATE TABLE public.server_folder_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  folder_id UUID NOT NULL REFERENCES public.server_folders(id) ON DELETE CASCADE,
  server_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.server_folder_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own folder items" ON public.server_folder_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.server_folders WHERE id = folder_id AND user_id = auth.uid()));
CREATE POLICY "Users can create own folder items" ON public.server_folder_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.server_folders WHERE id = folder_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own folder items" ON public.server_folder_items FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.server_folders WHERE id = folder_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own folder items" ON public.server_folder_items FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.server_folders WHERE id = folder_id AND user_id = auth.uid()));

-- Profile gradient columns
ALTER TABLE public.profiles ADD COLUMN name_gradient_start TEXT;
ALTER TABLE public.profiles ADD COLUMN name_gradient_end TEXT;
