-- ─── 1. is_bot flag on profiles ──────────────────────────────────────────────
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_bot boolean DEFAULT false;

-- ─── 2. Bot user in auth.users (fixed UUID so the edge function can reference it) ──
-- The handle_new_user() trigger will auto-create the profile row.
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud
)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'bot@mshb.internal',
  '',
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Update the auto-created profile with bot details
UPDATE public.profiles
SET
  display_name = 'Mshb FreeStuff',
  username     = 'mshb-freestuff',
  avatar_url   = 'https://api.dicebear.com/7.x/bottts/svg?seed=mshb-freestuff',
  is_bot       = true
WHERE user_id = '00000000-0000-0000-0000-000000000001';

-- ─── 3. free_games_channel_id on servers ─────────────────────────────────────
ALTER TABLE public.servers
  ADD COLUMN IF NOT EXISTS free_games_channel_id uuid
  REFERENCES public.channels(id) ON DELETE SET NULL;

-- ─── 4. bot_posted_games tracking table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bot_posted_games (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id  uuid NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  game_id    text NOT NULL,
  posted_at  timestamptz DEFAULT now(),
  UNIQUE (server_id, game_id)
);

ALTER TABLE public.bot_posted_games ENABLE ROW LEVEL SECURITY;
-- Service role only; no user-facing policies needed
-- Bot membership is handled by 20260319100002_bot_trigger_guard.sql
