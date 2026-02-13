

# Discord-Style 3-Panel Chat Layout

## Overview
Redesign the DM Chat page (`/chat/:threadId`) to use a 3-panel layout matching Discord's design: a conversation list on the left, the chat area in the center, and the other user's profile panel on the right.

## Layout Structure

On **desktop** (768px+):
```text
+------------------+-----------------------------+-------------------+
|  Left Sidebar    |      Chat Area (center)     |  Right Panel      |
|  (w-64, 256px)   |      (flex-1)               |  (w-72, 288px)    |
|                  |                              |                   |
|  Search bar      |  Header: name + status      |  Avatar (large)   |
|  "Create Group"  |  Messages list              |  Display name     |
|  DM/Group list   |  Typing indicator           |  Username          |
|  (same as Inbox) |  Composer input             |  Status badge     |
|                  |                              |  Status text      |
|                  |                              |  "About Me"       |
|                  |                              |  Member since     |
+------------------+-----------------------------+-------------------+
```

On **mobile** (<768px): Keep the current single-column behavior. When on `/chat/:threadId`, show only the chat view with a back button. The Inbox page remains the thread list. The right profile panel is hidden on mobile (optionally toggled via the header).

## Changes

### 1. `src/pages/Chat.tsx` -- Major restructure

- Wrap the existing chat in a 3-column flex layout (desktop only)
- **Left panel**: Extract a `ChatSidebar` component that reuses the Inbox thread list logic (DM + group items, search, create group button). Highlight the active thread. Clicking a thread navigates to it.
- **Center panel**: The existing chat (header, messages, composer) stays mostly the same. Remove the back arrow on desktop (sidebar is always visible). Keep it on mobile.
- **Right panel**: New `UserProfilePanel` component showing:
  - Large avatar with online status ring
  - Display name + username
  - Status indicator + status text
  - "About Me" section (status_text)
  - "Member Since" date (profile.created_at)
  - A divider and section styling matching Discord's dark card look
- On mobile, hide left and right panels; show only center chat with back button

### 2. New component: `src/components/chat/ChatSidebar.tsx`

- Extracts the thread list logic from Inbox.tsx into a reusable component
- Shows search input, create group button, and thread list (DM + group)
- Accepts `activeThreadId` prop to highlight current conversation
- Reuses the same data loading logic as Inbox

### 3. New component: `src/components/chat/UserProfilePanel.tsx`

- Accepts `profile: Profile` and presence info
- Displays:
  - Large avatar (80px) with status ring/badge
  - Display name (bold, larger)
  - @username
  - Status badge + status text
  - Separator
  - "Member Since" with formatted date
- Styled with the galaxy/glass theme to match existing UI

### 4. `src/pages/Inbox.tsx` -- Minor update

- When on desktop and a thread is selected, redirect to the chat view (the sidebar there shows the list)
- When no thread is selected (just `/`), show the full-page inbox as-is (fallback)

### 5. `src/components/layout/AppLayout.tsx` -- Conditional sidebar

- On the chat route, the AppLayout sidebar still renders but the Chat page internally manages its own left panel
- No changes needed if the Chat page handles its own 3-panel layout within the `<Outlet />`

### 6. i18n additions

- `profile.memberSince`: "Member Since" / "عضو منذ"
- `profile.aboutMe`: "About Me" / "نبذة عني"

## Mobile Behavior

- Left sidebar and right panel are hidden
- Chat fills full width
- Back button returns to Inbox
- User can tap the header avatar/name to see a sheet/drawer with the profile info (optional enhancement)

## Technical Notes

- The ChatSidebar will share data-fetching logic with Inbox but be a separate component to avoid circular dependencies
- The 3-panel layout uses CSS flex with fixed widths for side panels and flex-1 for the center
- RTL support: using `start`/`end` logical properties (already in use) ensures correct mirroring
- The right panel will be collapsible via a toggle button in the chat header for users who want more space

