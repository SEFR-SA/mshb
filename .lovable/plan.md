

## Click-to-View Member Profile Popup in Server Member List

### What This Does
When you click on a member in the server member list, a popup card will appear (like Discord) showing their full profile: banner, avatar, display name, username, about me, account creation date, server join date, role badges, and a quick message input field.

### Design (Based on Discord Reference)
- A Popover appears anchored to the clicked member row
- Banner image at the top (or colored fallback)
- Avatar overlapping the banner with status indicator
- Display name and @username
- Role badges (Owner/Admin/Member) shown as colored pills
- About Me section
- "Member Since" date (account creation)
- "Joined Server" date (from server_members.joined_at)
- A small text input at the bottom: "Message @username" for sending a quick DM

### Technical Details

**`src/components/server/ServerMemberList.tsx`**

1. Expand the profile data fetched to include `banner_url`, `about_me`, `created_at` fields
2. Expand the server_members query to also fetch `joined_at`
3. Update the `Member` interface to include `joined_at` and the extra profile fields
4. Import `Popover`, `PopoverTrigger`, `PopoverContent` from the existing UI component
5. Import `Separator`, `Input`, `StatusBadge`, `format` from date-fns
6. Wrap each member row in a `Popover` with `PopoverTrigger`
7. Add a `PopoverContent` containing:
   - Banner image or colored fallback (h-16)
   - Avatar (h-16 w-16) overlapping the banner with status badge
   - Display name (bold) and @username (muted)
   - Role badge as a colored pill (green for owner, blue for admin, gray for member)
   - About Me section (if present)
   - Separator
   - "Member Since" with formatted account creation date
   - "Joined Server" with formatted `joined_at` date
   - Separator
   - Text input: "Message @{username}" that navigates to or creates a DM thread on Enter
8. Add DM sending logic: on Enter in the text field, find or create a `dm_threads` row, insert a message, and navigate to the chat

**`src/i18n/en.ts`**

9. Add translation keys:
   - `profile.joinedServer` -- "Joined Server"
   - `profile.messageUser` -- "Message @{{name}}"

**`src/i18n/ar.ts`**

10. Add corresponding Arabic translations

### Files Modified
- `src/components/server/ServerMemberList.tsx` -- add click-to-view profile popover with all sections and quick message
- `src/i18n/en.ts` -- add new translation keys
- `src/i18n/ar.ts` -- add Arabic translations

