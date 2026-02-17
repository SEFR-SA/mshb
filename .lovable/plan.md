

## Refactor to Discord "Home" Layout Architecture

### Overview

Transform the current navigation from separate "Messages" and "Friends" buttons with independent pages into a unified Discord-style "Home" layout where clicking the Home button in the Server Rail reveals a sub-sidebar containing a "Friends" link and the DM list, while the main content area switches between the Friends Dashboard and individual chat views.

---

### Current Architecture (What Changes)

```text
Current:
[ServerRail] -> [Main Content Area via Outlet]
  - ServerRail has: Home (Messages) button + Friends button + Servers
  - "/" route renders Inbox.tsx (full-page DM list, auto-redirects to last DM on desktop)
  - "/friends" route renders Friends.tsx (includes its own ChatSidebar + ActiveNowPanel)
  - "/chat/:id" route renders Chat.tsx (includes its own ChatSidebar)
  - Each page independently includes ChatSidebar

New (Discord-style):
[ServerRail] -> [HomeSidebar] -> [Content Area]
  - ServerRail has: Home button (single) + Servers (no separate Friends button)
  - Home button activates a persistent HomeSidebar containing:
    - "Friends" nav item at top
    - DM thread list below
  - When "Friends" is selected: Content shows FriendsDashboard with tabs (Online, All, Pending, Blocked, Add Friend)
  - When a DM is selected: Content shows Chat view
  - ActiveNowPanel appears on the right ONLY when FriendsDashboard is active
```

---

### Changes

#### 1. Routes (`App.tsx`)

- Remove the separate `/friends` route
- Keep `/` as the Home route, but render a new `HomeView` component instead of `Inbox`
- Keep `/chat/:threadId` and `/group/:groupId` rendering through `HomeView` so the sidebar persists
- New route structure under `/`:
  - `/` (index) -- shows FriendsDashboard by default
  - `/friends` -- also shows FriendsDashboard (kept as alias)
  - `/chat/:threadId` -- shows Chat with persistent sidebar
  - `/group/:groupId` -- shows GroupChat with persistent sidebar

#### 2. Server Rail (`ServerRail.tsx`)

- Remove the separate "Friends" button (the Users icon button at line 247-260)
- Update the Home button to be active for `/`, `/friends`, `/chat/*`, `/group/*` routes
- Style the Home button with a Discord-shaped icon (a stylized controller/home shape using an SVG, transitioning from rounded-2xl to rounded-xl on active/hover like servers do)

#### 3. New Component: `HomeSidebar.tsx`

A persistent sidebar (w-60) shown when the Home section is active. Contains:
- **Header**: "Direct Messages" title with a "+" button to create new DM/group
- **Friends nav item**: A clickable row at the top with a Users icon and "Friends" text. Shows pending count badge. Links to `/friends` (or `/`).
- **Search bar**: For searching users to start DMs
- **DM thread list**: The existing ChatSidebar thread list (pinned section, DM items with avatars, status badges, last message preview, unread counts, hover states)
- **Bottom user panel**: Avatar, name, mute/deafen buttons, settings gear (moved from ChatSidebar)
- This replaces the current `ChatSidebar` for the Home context

#### 4. New Component: `FriendsDashboard.tsx`

The main content when Friends is active. Contains:
- **Top header bar**: "Friends" title + tab buttons: Online, All, Pending, Blocked + "Add Friend" button (green, prominent)
- **Online tab**: Shows only online friends (filtered by presence status)
- **All tab**: Shows all accepted friends with status badges
- **Pending tab**: Shows incoming/outgoing requests with accept/reject buttons
- **Blocked tab**: Shows blocked users (new -- uses existing block functionality if available, or placeholder)
- **Add Friend button**: When clicked, switches to an inline search/input area (not a modal) at the top of the content, with a text input "You can add friends with their username" and a "Send Friend Request" button
- All friend data/logic extracted from current `Friends.tsx`

#### 5. New Component: `HomeView.tsx`

A layout wrapper rendered at the Home route level. Structure:
```text
[HomeSidebar (w-60)] | [Content (flex-1)] | [ActiveNowPanel (w-[280px], conditional)]
```
- `HomeSidebar` is always visible (desktop) or in a drawer (mobile)
- Content area renders either `FriendsDashboard` or `Outlet` (for Chat/GroupChat)
- `ActiveNowPanel` only shows when FriendsDashboard is the active content (not during DM chats)
- On mobile: HomeSidebar is hidden, content takes full width, bottom nav shows Home/Friends/Profile

#### 6. Update `AppLayout.tsx`

- Remove the Friends nav item from mobile bottom nav (replace with single Home)
- The Home route now renders `HomeView` which handles its own sidebar layout
- Mobile bottom nav: Home (links to `/`), Profile (links to `/settings`)

#### 7. Update `Chat.tsx`

- Remove the `ChatSidebar` import and rendering -- the sidebar is now provided by `HomeView`
- Chat becomes a pure content component (messages + input only)
- Remove the `UserProfilePanel` toggling from Chat header or keep it as a slide-over

#### 8. Update `GroupChat.tsx`

- Same as Chat -- remove `ChatSidebar`, become a pure content component

#### 9. Remove/Deprecate

- `Inbox.tsx` -- replaced by `HomeView` + `FriendsDashboard`. Can be deleted.
- `Friends.tsx` -- replaced by `FriendsDashboard`. Can be deleted.
- `ChatSidebar.tsx` -- replaced by `HomeSidebar`. Can be deleted after migrating all logic.

#### 10. i18n Updates (`en.ts`, `ar.ts`)

- Add keys: `nav.home`, `friends.online`, `friends.blocked`, `friends.addFriend`, `friends.addFriendDescription`
- Keep existing keys that are still used

---

### Technical Details

| Area | Detail |
|---|---|
| Route structure | Nested routes: `/ -> HomeView` with children `index -> FriendsDashboard`, `friends -> FriendsDashboard`, `chat/:id -> Chat`, `group/:id -> GroupChat` |
| Sidebar persistence | `HomeSidebar` renders once in `HomeView`, `Outlet` swaps only the content area |
| ActiveNowPanel visibility | Conditionally rendered in `HomeView` based on `location.pathname === "/" or "/friends"` |
| Home button style | SVG Discord logo shape (simplified), transitions `rounded-2xl -> rounded-xl` on hover/active, green highlight when active |
| Mobile | HomeSidebar hidden; bottom nav has Home + Profile; tapping Home goes to FriendsDashboard; tapping a DM navigates to full-screen Chat |
| Friends tabs | Online tab filters friends by `getUserStatus(profile) !== "offline"`; Blocked tab is a new addition (queries a `blocked_users` table if exists, or shows placeholder) |
| Add Friend | Inline section at top of content area (not a modal), matching Discord's "ADD FRIEND" green bar with username input |

### Files Summary

| Action | File |
|---|---|
| Create | `src/components/layout/HomeSidebar.tsx` |
| Create | `src/pages/FriendsDashboard.tsx` |
| Create | `src/pages/HomeView.tsx` |
| Modify | `src/App.tsx` -- restructure routes |
| Modify | `src/components/layout/AppLayout.tsx` -- simplify mobile nav |
| Modify | `src/components/server/ServerRail.tsx` -- remove Friends button, update Home button |
| Modify | `src/pages/Chat.tsx` -- remove ChatSidebar |
| Modify | `src/pages/GroupChat.tsx` -- remove ChatSidebar |
| Modify | `src/i18n/en.ts` -- add new keys |
| Modify | `src/i18n/ar.ts` -- add new keys |
| Delete | `src/pages/Inbox.tsx` (logic moved to HomeSidebar) |
| Delete | `src/pages/Friends.tsx` (logic moved to FriendsDashboard) |

