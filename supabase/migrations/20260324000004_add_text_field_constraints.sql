-- Profiles: length limits and hex color format validation
ALTER TABLE public.profiles
  ADD CONSTRAINT display_name_max_length
    CHECK (display_name IS NULL OR char_length(display_name) <= 100),
  ADD CONSTRAINT about_me_max_length
    CHECK (char_length(about_me) <= 500),
  ADD CONSTRAINT status_text_max_length
    CHECK (char_length(status_text) <= 128),
  ADD CONSTRAINT profile_primary_color_hex
    CHECK (profile_primary_color IS NULL OR profile_primary_color ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT profile_accent_color_hex
    CHECK (profile_accent_color IS NULL OR profile_accent_color ~ '^#[0-9a-fA-F]{6}$');

-- Messages: enforce 5000-char cap at the DB layer (defense-in-depth behind the edge function)
ALTER TABLE public.messages
  ADD CONSTRAINT content_max_length
    CHECK (char_length(content) <= 5000);

-- Servers & channels: reasonable name limits
ALTER TABLE public.servers
  ADD CONSTRAINT name_max_length
    CHECK (char_length(name) <= 100);

ALTER TABLE public.channels
  ADD CONSTRAINT name_max_length
    CHECK (char_length(name) <= 100);
