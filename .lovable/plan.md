

## Context Menu UI Expansion — Technical Plan

### Phase 1: Friends & DM Sidebar Menus

**1A. Friends Page Context Menu (`UserContextMenu.tsx`)**
- Currently used in `FriendsDashboard.tsx`, wrapping each friend row
- Existing items: Message, Call, Add/Remove Friend, Copy Username
- **Add** before the Copy Username separator:
  - "Profile" (`User` icon) — `toast("Feature coming soon")`
  - "Invite to Server" (`UserPlus` icon) — `toast("Feature coming soon")`
  - "Block" (`Ban` icon, `className="text-destructive"`) — `toast("Feature coming soon")`

**1B. DM Sidebar Context Menu (`ThreadContextMenu.tsx`)**
- Currently used in `ChatSidebar.tsx` for each DM/group thread
- Existing items: Pin/Unpin, Mark as Read, Mute Notifications, Delete Conversation
- **Add** new props to the component interface (all optional callbacks defaulting to toast):
  - "Profile" (`User` icon) — `toast("Feature coming soon")`
  - "Call" (`Phone` icon) — `toast("Feature coming soon")`
  - "Close DM" (`X` icon) — `toast("Feature coming soon")`
  - Separator, then "Block" (`Ban` icon, `text-destructive`) — `toast("Feature coming soon")`
- These items render conditionally when appropriate (e.g., only for DM threads, not groups)

---

### Phase 2: Server & Folder Menus

**2A. Server Avatar Context Menu (`ServerRail.tsx`, lines 459-508)**
- **Add** before the Copy Invite item:
  - "Create Channel" (`Plus` icon) — `toast("Feature coming soon")`
  - "Create Category" (`FolderPlus` icon) — `toast("Feature coming soon")`
- **Modify** Server Settings submenu (lines 474-493): Add missing tab entries:
  - "Server Tag" (`Tag` icon) → `openSettings(s.id, "tag")`
  - "Engagement" (`TrendingUp` icon) → `openSettings(s.id, "engagement")`
  - "Emojis" (`Smile` icon) → `openSettings(s.id, "emojis")`
  - "Stickers" (`Sticker` icon) → `openSettings(s.id, "stickers")`
  - "Soundboard" (`Volume2` icon) → `openSettings(s.id, "soundboard")`
- **BUG FIX**: `t("servers.markAsRead")` key does not exist in either `src/i18n/en.ts` or `src/i18n/ar.ts`. Will add the missing key to both i18n files, OR fallback to hardcoded "Mark as Read" text.

**2B. Server Folder Context Menu (`ServerFolder.tsx`, lines 148-158)**
- Existing: Rename Folder, Ungroup
- **Add** before Rename:
  - "Mark Folder as Read" (`CheckCheck` icon) — `toast("Feature coming soon")`

---

### Phase 3: Message Context Menus

**Message Context Menu (`MessageContextMenu.tsx`)**

Currently: Copy, Reply, Edit (mine only), Mark Unread, Delete for Me, Delete for Everyone (mine only).

- **Add for ALL messages** (after Reply, before Mark Unread):
  - "Add Reaction" (`Smile` icon) — `toast("Feature coming soon")`
  - "Forward" (`Forward` icon) — `toast("Feature coming soon")`
  - "Pin Message" (`Pin` icon) — `toast("Feature coming soon")`

- **Add for OTHER people's messages only** (after separator, `!isMine`):
  - "Report Message" (`Flag` icon, `text-destructive`) — `toast("Feature coming soon")`

---

### Files to modify

| File | Changes |
|------|---------|
| `src/components/chat/UserContextMenu.tsx` | Add Profile, Invite to Server, Block items |
| `src/components/chat/ThreadContextMenu.tsx` | Add Profile, Call, Close DM, Block items |
| `src/components/chat/ChatSidebar.tsx` | Pass new thread type info to ThreadContextMenu |
| `src/components/server/ServerRail.tsx` | Add Create Channel, Create Category; expand Settings submenu; fix markAsRead i18n |
| `src/components/server/ServerFolder.tsx` | Add Mark Folder as Read item + prop |
| `src/components/chat/MessageContextMenu.tsx` | Add Reaction, Forward, Pin, Report items |
| `src/i18n/en.ts` | Add `servers.markAsRead` key |
| `src/i18n/ar.ts` | Add `servers.markAsRead` key |

All new items use `toast({ title: "Feature coming soon" })` or equivalent — no backend logic.

