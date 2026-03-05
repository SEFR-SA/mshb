

## Mark Folder as Read + Invite to Server

### Phase 1: Mark Folder as Read

The `handleMarkAsRead` function in `ServerRail.tsx` (line 182) already marks a single server as read by upserting `channel_read_status` for all text channels. The `ServerFolder` component (line 150) has a placeholder toast.

**Approach:** Pass a new `onMarkFolderAsRead` callback prop to `ServerFolder`. In `ServerRail.tsx`, define this callback to run `handleMarkAsRead` for every server in the folder via `Promise.all`.

**Files modified:**
- `src/components/server/ServerFolder.tsx` — Replace placeholder toast with `onMarkFolderAsRead()` prop call
- `src/components/server/ServerRail.tsx` — Pass `onMarkFolderAsRead` prop that calls `Promise.all(servers.map(s => handleMarkAsRead(s.id)))`

### Phase 2: Invite to Server Modal

Create a reverse-flow modal: user right-clicks a friend, selects "Invite to Server", then picks a server from a list.

**New files:**
1. `src/contexts/InviteToServerContext.tsx` — Context holding `targetUserId`, `isOpen`, `openInviteToServer(userId)`, `close()`
2. `src/components/chat/InviteToServerModal.tsx` — Responsive Dialog/Drawer that:
   - Fetches servers the current user is a member of (from `server_members` join `servers`)
   - Shows search + server list with "Invite" button next to each
   - On click: reuses the exact `sendInvite` pattern from `InviteModal.tsx` — creates/finds DM thread, fetches server invite code, inserts a `type: "server_invite"` message with metadata
   - Shows success toast + marks sent

**Files modified:**
- `src/App.tsx` — Wrap with `InviteToServerProvider`, render `<InviteToServerModal />`
- `src/components/chat/UserContextMenu.tsx` — Replace placeholder toast (line 122) with `openInviteToServer(targetUserId)`

### i18n
- Add `inviteToServer` key to `en.ts` and `ar.ts` (e.g., "Invite to Server" / "دعوة إلى سيرفر")

### Files Summary

| File | Action |
|------|--------|
| `src/components/server/ServerFolder.tsx` | Add `onMarkFolderAsRead` prop, wire it |
| `src/components/server/ServerRail.tsx` | Pass `onMarkFolderAsRead` callback |
| `src/contexts/InviteToServerContext.tsx` | **New** — global state for target friend |
| `src/components/chat/InviteToServerModal.tsx` | **New** — server picker modal |
| `src/App.tsx` | Add provider + modal |
| `src/components/chat/UserContextMenu.tsx` | Wire "Invite to Server" menu item |
| `src/i18n/en.ts` + `ar.ts` | New translation keys |

