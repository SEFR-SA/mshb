

## Fix: Storage RLS Policy for Group Image Uploads

### Problem
The storage bucket `avatars` has an INSERT policy that requires the first folder in the file path to match the authenticated user's ID:

```
auth.uid()::text = storage.foldername(name)[1]
```

Group images are uploaded to `groups/{groupId}/avatar.ext`, so the first folder is `groups` -- not the user's ID. This causes the RLS violation.

The same restriction applies to UPDATE and DELETE policies.

### Solution
Update the three storage policies (INSERT, UPDATE, DELETE) to also allow authenticated users to upload/update/delete files in the `groups/` folder path, as long as they are an admin of the group (using the existing `is_group_admin` function).

### Database Migration

**Drop and recreate the INSERT, UPDATE, and DELETE policies** on `storage.objects`:

```sql
-- INSERT: allow user folder OR group folder (if group admin)
DROP POLICY "Auth users can upload avatars" ON storage.objects;
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
DROP POLICY "Users can update own avatars" ON storage.objects;
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
DROP POLICY "Users can delete own avatars" ON storage.objects;
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
```

### How It Works
- Files at `{userId}/...` -- allowed if `auth.uid()` matches (existing behavior)
- Files at `groups/{groupId}/...` -- allowed if the user is an admin of that group

### Files Modified
- **One database migration** to update the three storage RLS policies

No code changes needed -- the upload logic in `GroupSettingsDialog.tsx` already uses the correct path format `groups/${groupId}/avatar.ext`.

