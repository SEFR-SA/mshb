

## Admin Channel Management (Edit, Delete, Add Members)

### Overview
Add a three-dot context menu on each channel in the sidebar (visible only to admins) that provides options to edit the channel name, toggle private/public, add/remove members, and delete the channel.

### Changes

**`src/components/server/ChannelSidebar.tsx`**
- Import `MoreVertical`, `Pencil`, `Trash2`, `Users` from lucide-react
- Import `DropdownMenu`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuTrigger` from ui/dropdown-menu
- Add state for:
  - `editChannel` (the channel being edited, or null)
  - `editName` (string for the name input)
  - `editIsPrivate` (boolean toggle)
  - `editMembers` (string[] of selected member IDs)
  - `editOpen` (boolean for the edit dialog)
  - `manageMembersChannel` (channel for the member management dialog)
  - `manageMembersOpen` (boolean)
  - `deleteChannelId` (string or null, for confirm dialog)
- For each channel item (both text and voice), when `isAdmin` is true, show a three-dot icon button on the right side of the row (visible on hover via group/group-hover classes)
- The dropdown menu contains:
  - "Edit Channel" -- opens an edit dialog pre-filled with the channel name and private/public toggle
  - "Manage Members" -- only shown if the channel is private; opens a member picker dialog showing current members with ability to add/remove
  - "Delete Channel" -- opens a confirmation alert dialog
- **Edit Dialog**: similar to create dialog but pre-filled; on save calls `supabase.from("channels").update({ name, is_private }).eq("id", channelId)`. If switching from public to private, show member picker. If switching from private to public, delete all `channel_members` rows for that channel.
- **Manage Members Dialog**: fetches current `channel_members` for the channel, shows server members with checkboxes (checked = has access). On save, diff against current and insert/delete `channel_members` rows accordingly.
- **Delete Confirmation**: uses AlertDialog; on confirm calls `supabase.from("channels").delete().eq("id", channelId)` (cascade will clean up `channel_members` rows)

**`src/i18n/en.ts`**
- Add keys under `channels`:
  - `edit`: "Edit Channel"
  - `editDesc`: "Update the channel settings."
  - `delete`: "Delete Channel"
  - `deleteConfirm`: "Are you sure you want to delete this channel? This action cannot be undone."
  - `deleted`: "Channel deleted"
  - `updated`: "Channel updated"
  - `manageMembers`: "Manage Members"
  - `manageMembersDesc`: "Add or remove members from this private channel."

**`src/i18n/ar.ts`**
- Add matching Arabic translations for the above keys

### No Database Changes Needed
- The existing `channels` table already has UPDATE and DELETE RLS policies restricted to server admins (`is_server_admin`)
- The `channel_members` table already has INSERT and DELETE policies for server admins
- All needed permissions are already in place

### Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/server/ChannelSidebar.tsx` | Modify | Add 3-dot dropdown per channel, edit/delete/manage-members dialogs |
| `src/i18n/en.ts` | Modify | Add channel management translation keys |
| `src/i18n/ar.ts` | Modify | Add Arabic translations |

