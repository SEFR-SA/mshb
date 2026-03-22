
ALTER TABLE public.profiles ADD COLUMN status text NOT NULL DEFAULT 'online';
ALTER TABLE public.profiles ADD COLUMN status_until timestamptz;
