ALTER TABLE public.voice_channel_participants ADD COLUMN is_muted boolean NOT NULL DEFAULT false;
ALTER TABLE public.voice_channel_participants ADD COLUMN is_deafened boolean NOT NULL DEFAULT false;