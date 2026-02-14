

## Discord-Style 4-Panel Layout for Friends Page

### Overview
Restructure the Friends page to match Discord's layout: **Server Rail** (already in AppLayout) | **DM Sidebar** (reuse ChatSidebar with bottom user panel) | **Friends tabs content** | **Active Now panel**.

Currently the Friends page renders just the tabs + Active Now. We need to add the ChatSidebar component on the left, which already includes the DM list, search, and the bottom user panel (avatar, display name, @username, mute/deafen, settings).

### Changes

**File: `src/pages/Friends.tsx`**

1. Import `ChatSidebar` component
2. Wrap the existing layout with `ChatSidebar` on the left side
3. The overall return structure becomes:

```
<div className="flex h-full">
  <ChatSidebar />              <!-- DM list + bottom user panel -->
  <div className="flex-1 ..."> <!-- Friends tabs content -->
    ...existing tabs UI...
  </div>
  <div className="hidden lg:block w-[280px]"> <!-- Active Now -->
    <ActiveNowPanel />
  </div>
</div>
```

4. Add a "Friends" nav item at the top of the sidebar area (highlighted) to match Discord's pattern where "Friends" appears as a selected item in the DM sidebar -- this is already handled by the ChatSidebar having the thread list, and the Friends page being a separate route.

### Technical Details

The `ChatSidebar` component already contains:
- Search bar for finding users
- DM and group thread list with pinned items
- Bottom user panel with avatar, display name, @username, mute/deafen buttons, and settings icon
- All realtime subscriptions for updates

The only change needed is in `src/pages/Friends.tsx` -- add `<ChatSidebar />` before the friends content area. The `activeThreadId` prop can be left undefined since no thread is selected on the Friends page.

### Files Modified

| File | Changes |
|---|---|
| `src/pages/Friends.tsx` | Import and render `ChatSidebar` on the left side of the layout |

No database changes needed.

