
-- INSERT: allow user folder OR group folder (if group admin)
DROP POLICY IF EXISTS "Auth users can upload avatars" ON storage.objects;
CREATE POLICY "Auth users can upload avatars" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'groups'
      AND is_group_admin(auth.uid(), (storage.foldername(name))[2]::uuid)
    )
  )
);

-- UPDATE
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'groups'
      AND is_group_admin(auth.uid(), (storage.foldername(name))[2]::uuid)
    )
  )
);

-- DELETE
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars' AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR (
      (storage.foldername(name))[1] = 'groups'
      AND is_group_admin(auth.uid(), (storage.foldername(name))[2]::uuid)
    )
  )
);
