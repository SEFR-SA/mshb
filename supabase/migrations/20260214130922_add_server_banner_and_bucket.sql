
-- Add banner_url to servers
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS banner_url text;

-- Create storage bucket for server assets
INSERT INTO storage.buckets (id, name, public) VALUES ('server-assets', 'server-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for server-assets
CREATE POLICY "Server assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'server-assets');

CREATE POLICY "Server admins can upload assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'server-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Server admins can update assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'server-assets' AND auth.role() = 'authenticated');

CREATE POLICY "Server admins can delete assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'server-assets' AND auth.role() = 'authenticated');

-- Voice channel presence table
CREATE TABLE public.voice_channel_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(channel_id, user_id)
);
ALTER TABLE public.voice_channel_participants ENABLE ROW LEVEL SECURITY;

-- RLS for voice_channel_participants
CREATE POLICY "Server members can view voice participants"
ON public.voice_channel_participants FOR SELECT
USING (
  public.is_server_member(auth.uid(), (SELECT server_id FROM public.channels WHERE id = voice_channel_participants.channel_id))
);

CREATE POLICY "Users can join voice channels"
ON public.voice_channel_participants FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  public.is_server_member(auth.uid(), (SELECT server_id FROM public.channels WHERE id = voice_channel_participants.channel_id))
);

CREATE POLICY "Users can leave voice channels"
ON public.voice_channel_participants FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for voice participants
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_channel_participants;

-- Allow server_members role updates by admins
CREATE POLICY "Admin can update member roles"
ON public.server_members FOR UPDATE
USING (public.is_server_admin(auth.uid(), server_id));
