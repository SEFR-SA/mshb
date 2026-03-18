ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS profile_primary_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS profile_accent_color  text DEFAULT NULL;
