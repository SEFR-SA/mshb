ALTER TABLE public.server_events
  ADD COLUMN frequency text NOT NULL DEFAULT 'DOES_NOT_REPEAT';