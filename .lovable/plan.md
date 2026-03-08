

## Plan: Two Fixes

### 1. Fix Build Error in `FullProfileModal.tsx`

The `servers` table uses `icon_url`, not `avatar_url`. Two changes needed:

- **Line 39**: Change `MutualServer` interface from `avatar_url` to `icon_url`
- **Line 197**: Change the select query from `"id,name,avatar_url"` to `"id,name,icon_url"`
- **Lines 86-88** in `ServerRow`: Update references from `server.avatar_url` to `server.icon_url`

### 2. Increase Avatar Size in `UserProfilePanel`

Looking at the screenshots: the server member sidebar profile panel (`UserProfilePanel.tsx`) shows a smaller avatar (80px) compared to the `FullProfileModal` desktop view (120px).

**File: `src/components/chat/UserProfilePanel.tsx`**
- Change avatar from `h-20 w-20` (80px) → `h-[120px] w-[120px]` (120px)
- Update `AvatarDecorationWrapper` size prop from `80` → `120`
- Adjust the banner overlap offset (`-mt-10` → `-mt-16`) to accommodate the larger avatar

| File | Change |
|------|--------|
| `src/components/FullProfileModal.tsx` | Fix `avatar_url` → `icon_url` for servers query |
| `src/components/chat/UserProfilePanel.tsx` | Increase avatar from 80px to 120px |

