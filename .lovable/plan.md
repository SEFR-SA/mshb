
## Fix Mobile Responsiveness Issues

### Problems Identified

1. **Friends page -- ChatSidebar visible on mobile**: The `ChatSidebar` (256px wide) renders on all screen sizes, squeezing the Friends content into a tiny unusable strip. The tab labels ("All", "Pending", "Add") are cut off, friend names and action buttons are unreachable, and the bottom user panel from the sidebar overlaps the bottom navigation bar.

2. **Friends page -- "Remove friend" and "Message" buttons unreachable**: Because the sidebar takes most of the width, the action buttons on each friend row are pushed off-screen.

3. **Inbox page on mobile -- no thread list access**: The Inbox auto-redirects to the last DM thread. On mobile, there is no way to get back to the thread list to switch conversations (the back arrow in Chat.tsx navigates to `/` which triggers the redirect again). This is partially mitigated by the ChatSidebar being hidden on mobile in Chat.tsx, but users arriving at `/` with existing threads can never browse their conversation list on mobile.

### Solution

**File: `src/pages/Friends.tsx`**
- Import `useIsMobile` hook
- On mobile: hide the `ChatSidebar` completely (it is redundant since the bottom nav already provides navigation)
- On mobile: hide the `ActiveNowPanel` (already hidden via `hidden lg:block`, but the sidebar border container still shows)
- This gives the Friends content the full screen width on mobile

**File: `src/pages/Inbox.tsx`**
- Import `useIsMobile` hook
- On mobile: skip the auto-redirect to the last DM thread, so users can see and browse their full conversation list
- This gives mobile users access to all their threads, group chats, and the "Create Group" button
- The existing thread list UI in Inbox.tsx is already a good mobile-friendly layout (full-width list items)

### Technical Details

| File | Change |
|---|---|
| `src/pages/Friends.tsx` | Add `useIsMobile` import; wrap `<ChatSidebar />` in `{!isMobile && ...}` conditional |
| `src/pages/Inbox.tsx` | Add `useIsMobile` import; modify the auto-redirect `useEffect` to skip when `isMobile` is true; remove the `redirecting` guard on mobile so the inbox list renders |

These are minimal, targeted changes that follow the existing pattern used in `Chat.tsx` and `GroupChat.tsx` (both already use `isMobile` to hide the sidebar).
