-- Add user_limit column to channels table for voice channel capacity
-- 0 = no limit (infinite)
ALTER TABLE public.channels
  ADD COLUMN IF NOT EXISTS user_limit INTEGER NOT NULL DEFAULT 0;
