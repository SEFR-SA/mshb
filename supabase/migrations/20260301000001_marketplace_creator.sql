-- ============================================================
-- Creator Studio: extend marketplace_items for user submissions
-- ============================================================

-- Add creator fields to the existing marketplace_items table
ALTER TABLE public.marketplace_items
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status     text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected'));

-- Drop the old open SELECT policy
DROP POLICY IF EXISTS "marketplace_items_public_select" ON public.marketplace_items;

-- Public sees only approved items; creators always see their own regardless of status
CREATE POLICY "marketplace_items_select"
  ON public.marketplace_items FOR SELECT
  USING (status = 'approved' OR creator_id = auth.uid());

-- Creators can INSERT their own items; status is forced to 'pending'
CREATE POLICY "marketplace_items_creator_insert"
  ON public.marketplace_items FOR INSERT
  WITH CHECK (auth.uid() = creator_id AND status = 'pending');

-- Creators can UPDATE their own pending/rejected items (cannot self-approve)
CREATE POLICY "marketplace_items_creator_update"
  ON public.marketplace_items FOR UPDATE
  USING  (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id AND status IN ('pending', 'rejected'));

-- Creators can DELETE their own non-approved items
CREATE POLICY "marketplace_items_creator_delete"
  ON public.marketplace_items FOR DELETE
  USING (auth.uid() = creator_id AND status IN ('pending', 'rejected'));

-- ============================================================
-- Storage: private bucket for raw creator uploads
-- Admin moves/copies files to a public bucket on approval
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
  VALUES ('pending_assets', 'pending_assets', false)
  ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload into their own subfolder only
CREATE POLICY "pending_assets_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pending_assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Creators can read their own files
CREATE POLICY "pending_assets_read_own"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'pending_assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Creators can delete their own files
CREATE POLICY "pending_assets_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'pending_assets'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
