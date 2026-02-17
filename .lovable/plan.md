
## Mobile UI Refactor: Discord-style Hierarchical Navigation

### Overview

Transform the mobile layout (screens under 768px) from the current hamburger-menu approach into a hierarchical navigation flow matching the Discord mobile app screenshots provided.

---

### Current Mobile Behavior (What Changes)

- **AppLayout.tsx**: Shows a top header with a hamburger menu (opens ServerRail in a Sheet) + bottom nav with Home and Profile tabs. The hamburger approach is not aligned with the Discord mobile layout.
- **HomeView.tsx**: On mobile, just renders `<Outlet />` with no sidebar -- no ServerRail, no Friends button, no DM list visible.
- **ServerView.tsx**: On mobile, shows the channel chat with Sheet drawers for ChannelSidebar and MemberList.
- **Chat.tsx**: Has a back button to "/" but no visible ServerRail alongside.

### New Mobile Architecture

```text
Home View (/ route):
  [ServerRail (72px)] | [Main Area: Search + Friends button + DM list]
  Bottom nav: Home | You

Friends View (/friends route):
  [Full-page FriendsDashboard with back nav]
  Tabs: Online | All | Pending | Blocked
  Alphabetical headers in All tab
  FAB for Add Friend
  Bottom nav: Home | You

DM Chat View (/chat/:id):
  [Full-page chat with back button header]
  Back button returns to Home (/)

Server Page (/server/:id):
  [ServerRail (72px)] | [ChannelSidebar (rest of width)]
  Bottom nav: Home | You

Channel Chat (/server/:id/channel/:id):
  [Full-page channel chat with back button]
  Back returns to Server Page (/server/:id)
```

---

### Changes

#### 1. `AppLayout.tsx` -- Remove hamburger, show ServerRail inline on mobile

- Remove the mobile top header with hamburger menu and Sheet drawer entirely
- Remove the `{!isMobile && <ServerRail />}` guard -- ServerRail now renders on mobile too, BUT only on Home and Server routes (controlled by child components)
- Actually, keep ServerRail rendering unconditionally; child views will decide if they show it
- Simplify mobile bottom nav to just "Home" and "You" (profile) tabs matching the Discord screenshots
- The bottom nav should use the friends icon (like Discord's paw icon) for Home with unread badge, and the user's avatar for "You"

#### 2. `HomeView.tsx` -- Show ServerRail + DM list side by side on mobile

Currently on mobile it just renders `<Outlet />`. Change to:
- Render `ServerRail` (72px) on the left + main content area on the right
- Main content area shows: Search bar + "Friends" button (full width, prominent) + scrollable DM thread list
- This matches the "Home.png" screenshot: ServerRail visible on the left, Friends button + DM list on the right
- When a DM is tapped, navigate to `/chat/:id` which renders full-page (no sidebar)
- Reuse the DM list logic already in `HomeSidebar.tsx` but adapt for mobile layout

#### 3. `FriendsDashboard.tsx` -- Full-page on mobile, hide ServerRail

- On mobile, render as a full-page view (no ServerRail visible)
- Add a header with back button or rely on bottom nav to go Home
- Add tabs: Online, All, Pending, Blocked
- **All tab enhancement**: Sort friends alphabetically and insert letter headers (A, B, C...)
- Add a floating action button (circular, bottom-right) for "Add Friend" that triggers the add friend inline section or opens a modal
- Bottom nav still visible

#### 4. `Chat.tsx` -- Full-page with back button header

- Already has a back button on mobile going to `/`. This is correct.
- The header should match the DMs screenshot: back arrow (with unread badge on the arrow area), avatar, username, call/video buttons
- Ensure no ServerRail is shown (it's hidden because HomeView doesn't render on this route when navigating)

Wait -- actually, the route structure is: HomeView wraps Chat. So we need HomeView to NOT render the ServerRail when showing a chat on mobile.

**Revised approach for HomeView mobile:**
- Check if the current path is exactly `/` or `/friends` -- show ServerRail + DM list
- If path is `/chat/:id` or `/group/:id` -- render just the Outlet (full-page chat)
- This way, when viewing a DM chat, it's full-screen with back button

#### 5. `ServerView.tsx` -- Two-phase mobile layout

**Phase 1 - Server Page** (when no channelId or when showing channel list):
- Show ServerRail (72px) on left + ChannelSidebar filling the rest
- Matches "Server_Page.png": ServerRail visible with channel list
- Bottom nav visible

**Phase 2 - Channel Chat** (when channelId is selected):
- Full-page channel chat view (no ServerRail, no ChannelSidebar)
- Header with back button + "#channel-name" + online count
- Back button navigates to `/server/:serverId` (removes channelId, shows Phase 1)
- Matches "Server_Chatting.png"

#### 6. `ServerRail.tsx` -- No changes needed for mobile rendering

The ServerRail component itself stays the same. The parent components decide when to show it.

#### 7. Bottom Navigation Bar

Consistent across Home and Server views on mobile:
- **Home** tab: Uses a friends/paw icon with unread badge. Links to `/`.
- **You** tab: Shows user avatar with status badge. Links to `/settings`.
- Styled to match Discord: dark background, minimal, two-tab layout

---

### Technical Details

| Area | Detail |
|---|---|
| HomeView mobile | Conditionally render ServerRail + DM list OR just Outlet based on current path |
| FriendsDashboard All tab | Sort friends alphabetically, group by first letter, render letter headers |
| FriendsDashboard Add Friend | Circular FAB button (bottom-right) opening add friend section |
| ServerView mobile | Two-phase: no channelId = ServerRail + ChannelSidebar; with channelId = full-page chat |
| Chat/GroupChat header | Back arrow with unread badge indicator, avatar, username, action buttons |
| Bottom nav | Rendered in AppLayout, 2 tabs: Home (friends icon) + You (avatar) |
| Back navigation | Chat back goes to "/", Channel chat back goes to "/server/:serverId" |

### Files Summary

| Action | File |
|---|---|
| Modify | `src/components/layout/AppLayout.tsx` -- remove mobile hamburger header, simplify bottom nav to 2 tabs |
| Modify | `src/pages/HomeView.tsx` -- on mobile: show ServerRail + search + Friends btn + DM list for root paths; full-page Outlet for chat paths |
| Modify | `src/pages/FriendsDashboard.tsx` -- mobile-specific layout: full-page, alphabetical headers in All tab, FAB for add friend |
| Modify | `src/pages/ServerView.tsx` -- mobile two-phase: ServerRail + ChannelSidebar vs full-page channel chat |
| Modify | `src/pages/Chat.tsx` -- enhance mobile header to match Discord DM screenshot style |
| Modify | `src/pages/GroupChat.tsx` -- same mobile header enhancements |
| Modify | `src/i18n/en.ts` -- add any new translation keys |
| Modify | `src/i18n/ar.ts` -- add any new translation keys |
