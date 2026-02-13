

# Fix Group Members + Group Settings Enhancements

## Issue 1: Group Members Not Being Saved

### Root Cause
The `CreateGroupDialog` inserts the creator and selected members in a **single bulk insert** to `group_members`. The RLS INSERT policy allows:
- `is_group_admin(auth.uid(), group_id)` -- fails because creator is not a member yet
- `auth.uid() = user_id AND created_by = auth.uid()` -- only works for the creator's own row, not for other members' rows

So the creator's row might insert, but all other members' rows fail silently because `auth.uid() != user_id` for those rows.

### Fix
Two changes needed:

**1. Code change in `CreateGroupDialog.tsx`**: Split the insert into two steps -- first add the creator as admin, then add other members. After the creator is an admin, `is_group_admin` will return true for subsequent inserts.

```typescript
// Step 1: Add creator as admin
await supabase.from("group_members").insert({ group_id: group.id, user_id: user.id, role: "admin" });

// Step 2: Now creator is admin, so this will pass the is_group_admin check
const otherMembers = Array.from(selectedIds).map(uid => ({ group_id: group.id, user_id: uid, role: "member" }));
if (otherMembers.length > 0) {
  await supabase.from("group_members").insert(otherMembers);
}
```

---

## Issue 2: Group Settings -- Add Photo and Banner Upload

### Database Migration
Add a `banner_url` column to `group_threads` (the `avatar_url` column already exists).

```sql
ALTER TABLE public.group_threads ADD COLUMN IF NOT EXISTS banner_url text;
```

### Storage
Use the existing `avatars` bucket for group images too (it's already public).

### Changes to `GroupSettingsDialog.tsx`
- Add group profile photo upload (updates `avatar_url` on `group_threads`)
- Add group banner upload (updates `banner_url` on `group_threads`)
- Show current photo/banner with upload buttons (admin only)
- Use same upload pattern as user profile (upload to `avatars` bucket, save URL)

### Changes to `GroupChat.tsx`
- Display group avatar in the header using `AvatarImage`
- Pass `banner_url` to `GroupMembersPanel`

### i18n Updates
Add translation keys for group photo/banner labels in `en.ts` and `ar.ts`:
- `groups.profilePhoto`: "Group Photo"
- `groups.banner`: "Group Banner"
- `groups.uploadPhoto`: "Upload Photo"
- `groups.uploadBanner`: "Upload Banner"

---

## Technical Details

### Files Modified
- **Database migration**: Add `banner_url` column to `group_threads`
- `src/components/CreateGroupDialog.tsx`: Split member insertion into two sequential calls
- `src/components/GroupSettingsDialog.tsx`: Add photo and banner upload sections with file input and storage upload
- `src/pages/GroupChat.tsx`: Show group avatar in header, pass banner to members panel
- `src/components/chat/GroupMembersPanel.tsx`: Accept and display banner
- `src/i18n/en.ts`: Add group photo/banner translation keys
- `src/i18n/ar.ts`: Add Arabic translations

