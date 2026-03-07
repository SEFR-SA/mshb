-- ═══════════════════════════════════════════════════
-- Marketplace Revamp — Phase 1: Schema Update
-- Replaces old categories (banner/avatar/soundboard/sticker/emoji)
-- with profile cosmetics (avatar_decoration/profile_effect/nameplate/tag/bundle)
-- ═══════════════════════════════════════════════════

-- 1. Clear old data (existing category values are incompatible with new schema)
DELETE FROM public.marketplace_items;

-- 2. Drop old CHECK constraints
ALTER TABLE public.marketplace_items
  DROP CONSTRAINT IF EXISTS marketplace_items_category_check;
ALTER TABLE public.marketplace_items
  DROP CONSTRAINT IF EXISTS marketplace_items_type_check;

-- 3. Drop old `type` column (static/gif/free — superseded by the renamed category column)
ALTER TABLE public.marketplace_items DROP COLUMN IF EXISTS type;

-- 4. Rename `name` → `title`
ALTER TABLE public.marketplace_items RENAME COLUMN name TO title;

-- 5. Rename `category` → `type`
ALTER TABLE public.marketplace_items RENAME COLUMN category TO type;

-- 6. Add new CHECK constraint on `type`
ALTER TABLE public.marketplace_items
  ADD CONSTRAINT marketplace_items_type_check
  CHECK (type IN ('avatar_decoration', 'profile_effect', 'nameplate', 'tag', 'bundle'));

-- 7. Add `description` column
ALTER TABLE public.marketplace_items
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

-- 8. Make `asset_url` nullable (bundles reference child items, not a single asset)
ALTER TABLE public.marketplace_items
  ALTER COLUMN asset_url DROP NOT NULL;

-- 9. Make `thumbnail_url` nullable
ALTER TABLE public.marketplace_items
  ALTER COLUMN thumbnail_url DROP NOT NULL;

-- ─── Bundle Items Junction Table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.bundle_items (
  bundle_id UUID NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  item_id   UUID NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  PRIMARY KEY (bundle_id, item_id)
);

ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

-- Public can read bundle contents only for approved bundles
CREATE POLICY "bundle_items_public_read"
  ON public.bundle_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_items
      WHERE id = bundle_id AND status = 'approved'
    )
  );

-- Creators can manage their own bundle contents
CREATE POLICY "bundle_items_creator_manage"
  ON public.bundle_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.marketplace_items
      WHERE id = bundle_id AND creator_id = auth.uid()
    )
  );
