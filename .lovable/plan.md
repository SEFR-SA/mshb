

## Floating User Profile Panel — Architecture Plan

### Current State
- **ChannelSidebar** (lines 886-984): Contains user profile + voice controls + audio controls pinned at bottom
- **HomeSidebar** (lines 417-455): Contains a simpler user profile + audio controls pinned at bottom
- Both panels are **trapped inside** their respective sidebar `div`, sitting below a `border-t`

### Architecture Challenge

The "float across ServerRail + Sidebar" effect requires the user panel to be positioned relative to a **parent that contains both columns**. Currently:

| View | ServerRail parent | Sidebar parent | Common ancestor |
|------|------------------|----------------|-----------------|
| Desktop Server | `AppLayout.tsx` `<main>` sibling | Inside `<main>` → `ServerView` | `AppLayout` flex row (line 76) |
| Desktop Home | `AppLayout.tsx` `<main>` sibling | Inside `<main>` → `HomeView` | `AppLayout` flex row (line 76) |
| Mobile Server | `ServerView` line 166 | `ServerView` line 168 | `ServerView` outer div |
| Mobile Home | `HomeView` line 48 | `HomeView` line 49 | `HomeView` outer div |

The common ancestor on **desktop** is the flex row in `AppLayout.tsx` (line 76: `<div className="flex flex-1 overflow-hidden min-h-0">`). This is where the floating panel must be absolutely positioned.

### Plan

#### Step 1: Extract User Panel into a standalone component
Create `src/components/layout/UserPanel.tsx` — a reusable component that renders:
- User avatar (h-8 w-8) + status badge
- Username + status text (stacked, text-xs)
- Audio controls (Mic, Headphones, Settings) — pulled from `useAudioSettings()`
- Voice connection bar (if in a voice channel) — pulled from `useVoiceChannel()`
- Soundboard popover (if applicable)

#### Step 2: Remove user panels from both sidebars
- **ChannelSidebar**: Remove lines 886-984 (the `{/* User Panel */}` block). Add `pb-16` to the scrolling channel list container.
- **HomeSidebar**: Remove lines 417-455 (the `{/* Bottom User Panel */}` block). Add `pb-16` to the thread list container.

#### Step 3: Place the floating panel in `AppLayout.tsx`
In the desktop flex row (line 76), add `relative` positioning. Then render `<UserPanel />` as `absolute bottom-0 left-0 z-50` with:
- Width: `w-[calc(72px+240px-16px)]` = spans Rail (72px) + Sidebar (240px) minus margins
- Margins: `m-2`
- Styling: `bg-surface border border-border/50 rounded-lg shadow-lg`
- Tight padding: `p-2`
- Only on desktop (`!isMobile`)

#### Step 4: Mobile handling
On mobile, the user panel is already hidden on server views (the sidebar doesn't show it in the same way), and the bottom nav in `AppLayout` serves as navigation. The floating panel should **not** appear on mobile — mobile uses the bottom nav bar instead.

#### Step 5: Add bottom padding to scroll containers
- **ServerRail** scroll area: Add `pb-16` so the last server icon scrolls above the floating panel
- **ChannelSidebar** scroll area: Add `pb-16` to the channel list
- **HomeSidebar** thread list: Add `pb-16`

### Files Modified
1. **New**: `src/components/layout/UserPanel.tsx` — extracted floating user panel
2. **Edit**: `src/components/server/ChannelSidebar.tsx` — remove user panel block (lines 886-984), add `pb-16` to channel list
3. **Edit**: `src/components/layout/HomeSidebar.tsx` — remove user panel block (lines 417-455), add `pb-16` to thread list
4. **Edit**: `src/components/layout/AppLayout.tsx` — add `relative` to flex row, render `<UserPanel />`
5. **Edit**: `src/components/server/ServerRail.tsx` — add `pb-16` to scroll container

### Visual Result
```text
┌──────────────────────────────────┐
│  Server Rail  │  Channel Sidebar │
│  (dark bg)    │  (light bg)      │
│               │                  │
│               │                  │
│               │                  │
│  ┌────────────────────────────┐  │
│  │ 🟢 Username    🎤 🎧 ⚙️  │  │ ← floating card, absolute
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

