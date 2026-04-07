
-- Enums
CREATE TYPE public.event_location_type AS ENUM ('voice', 'external');
CREATE TYPE public.event_status AS ENUM ('scheduled', 'active', 'completed', 'canceled');

-- server_events table
CREATE TABLE public.server_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  location_type event_location_type NOT NULL DEFAULT 'voice',
  channel_id uuid REFERENCES public.channels(id) ON DELETE SET NULL,
  external_location text,
  cover_image_url text,
  status event_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- event_rsvps table
CREATE TABLE public.event_rsvps (
  event_id uuid NOT NULL REFERENCES public.server_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);

-- RLS
ALTER TABLE public.server_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;

-- View: server members can see events
CREATE POLICY "Members can view events" ON public.server_events
  FOR SELECT TO authenticated
  USING (public.is_server_member(auth.uid(), server_id));

-- Insert: admins only
CREATE POLICY "Admins can insert events" ON public.server_events
  FOR INSERT TO authenticated
  WITH CHECK (public.is_server_admin(auth.uid(), server_id));

-- Update: admins only
CREATE POLICY "Admins can update events" ON public.server_events
  FOR UPDATE TO authenticated
  USING (public.is_server_admin(auth.uid(), server_id))
  WITH CHECK (public.is_server_admin(auth.uid(), server_id));

-- Delete: admins only
CREATE POLICY "Admins can delete events" ON public.server_events
  FOR DELETE TO authenticated
  USING (public.is_server_admin(auth.uid(), server_id));

-- RSVPs: members can view
CREATE POLICY "Members can view rsvps" ON public.event_rsvps
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.server_events e
    WHERE e.id = event_id AND public.is_server_member(auth.uid(), e.server_id)
  ));

-- RSVPs: users manage their own
CREATE POLICY "Users manage own rsvps" ON public.event_rsvps
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own rsvps" ON public.event_rsvps
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.event_rsvps;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('event_covers', 'event_covers', true);

-- Storage policies
CREATE POLICY "Anyone can view event covers" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'event_covers');

CREATE POLICY "Authenticated users can upload event covers" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'event_covers');

CREATE POLICY "Users can delete own event covers" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'event_covers');
