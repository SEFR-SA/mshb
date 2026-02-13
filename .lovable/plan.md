

# Add Badge Indicators to Navigation for New Messages and Friend Requests

## Overview
Add real-time badge counters to the navigation items so users can see at a glance when they have unread messages or pending friend requests.

## Current State
- The "Messages" nav item already shows a badge with unread message count (via the `useUnreadCount` hook)
- The "Friends" nav item has no badge indicator
- Pending friend requests are only visible once you navigate to the Friends page

## Changes

### 1. New hook: `src/hooks/usePendingFriendRequests.ts`
- Create a hook that counts **incoming** pending friend requests (`addressee_id = user.id AND status = 'pending'`)
- Subscribe to realtime changes on the `friendships` table to auto-update
- Returns `pendingCount` (number)

### 2. Update `src/components/layout/AppLayout.tsx`
- Import and use the new `usePendingFriendRequests` hook
- Add a `badgeCount` property to each nav item (messages = `totalUnread`, friends = `pendingCount`, settings = 0)
- Render the badge for any nav item where `badgeCount > 0` (currently only messages has this logic -- generalize it to all items)
- Apply the same badge styling to both desktop sidebar and mobile bottom nav

### 3. Update `src/components/chat/ChatSidebar.tsx`
- The ChatSidebar also renders navigation-like items but does not need friend request badges since it only shows conversations

## Technical Details

### `usePendingFriendRequests` hook
```
- Query: supabase.from("friendships").select("id", { count: "exact", head: true })
    .eq("addressee_id", user.id).eq("status", "pending")
- Realtime: subscribe to postgres_changes on friendships table
- Returns { pendingCount: number }
```

### Nav items badge mapping
```
navItems = [
  { to: "/", icon: MessageSquare, label: "Messages", badge: totalUnread },
  { to: "/friends", icon: Users, label: "Friends", badge: pendingCount },
  { to: "/settings", icon: Settings, label: "Settings", badge: 0 },
]
```

### Files Created
- `src/hooks/usePendingFriendRequests.ts`

### Files Modified
- `src/components/layout/AppLayout.tsx` -- add friend request badge to nav

