-- Add separate pill background color column (SVG/badge fill color stays in server_tag_color)
ALTER TABLE public.servers
  ADD COLUMN IF NOT EXISTS server_tag_container_color TEXT;

-- Backfill: existing rows used server_tag_color for the pill background → copy it
UPDATE public.servers
  SET server_tag_container_color = server_tag_color
  WHERE server_tag_color IS NOT NULL
    AND server_tag_container_color IS NULL;

-- Clear stale image URL values stored in server_tag_badge
-- (badge now only stores preset IDs like 'crown', 'sword', 'skull', 'potion', etc.)
UPDATE public.servers
  SET server_tag_badge = NULL
  WHERE server_tag_badge LIKE 'http%';
