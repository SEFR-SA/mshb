

## Custom Right-Click Context Menu on Server Icons

### What This Does
When you right-click on a server icon in the Server Rail, instead of the browser's default context menu, a custom styled menu will appear with server-specific actions -- just like Discord.

### Menu Options
- **Server Settings** -- opens the server settings dialog (visible to all members)
- **Copy Invite Code** -- copies the server's invite code to clipboard
- **Leave Server** -- leaves the server (hidden if you're the owner)
- **Delete Server** -- deletes the server entirely (only visible to the server owner, shown in red)

### How It Works
The existing Radix UI `ContextMenu` component (already installed at `src/components/ui/context-menu.tsx`) will be wrapped around each server icon in the Server Rail. Right-clicking triggers the custom menu and prevents the browser default. Left-clicking still navigates to the server as usual.

### Technical Details

**`src/components/server/ServerRail.tsx`**

1. Import `ContextMenu`, `ContextMenuTrigger`, `ContextMenuContent`, `ContextMenuItem`, `ContextMenuSeparator` from the existing UI component
2. Import `ServerSettingsDialog` and relevant icons (`Settings`, `Copy`, `LogOut`, `Trash2`)
3. Fetch additional data: for each server, also load `owner_id` and `invite_code` so the menu knows what to show
4. Update the `Server` interface to include `owner_id` and `invite_code`
5. Wrap each server's `NavLink` in a `ContextMenu` + `ContextMenuTrigger`
6. Add `ContextMenuContent` with the four menu items:
   - "Server Settings" -- opens `ServerSettingsDialog` for that server
   - "Copy Invite Code" -- copies `s.invite_code` to clipboard with a toast
   - "Leave Server" -- deletes the user's `server_members` row and navigates home (hidden for owner)
   - "Delete Server" -- deletes the server from the `servers` table (only shown for owner, styled destructive)
7. Add state for `settingsServerId` to track which server's settings dialog to open
8. Add a confirmation dialog for "Delete Server" to prevent accidental deletion

**`src/i18n/en.ts` and `src/i18n/ar.ts`**

9. Add translation keys:
   - `servers.copyInviteCode` -- "Copy Invite Code"
   - `servers.deleteServer` -- "Delete Server"
   - `servers.deleteServerConfirm` -- "Are you sure? This will permanently delete the server and all its channels."
   - `servers.serverDeleted` -- "Server deleted"

### Files Modified
- `src/components/server/ServerRail.tsx` -- add ContextMenu around server icons with actions
- `src/i18n/en.ts` -- add new translation keys
- `src/i18n/ar.ts` -- add Arabic translation keys

