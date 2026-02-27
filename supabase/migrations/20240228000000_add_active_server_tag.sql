ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_server_tag_id UUID REFERENCES public.servers(id) ON DELETE SET NULL;
