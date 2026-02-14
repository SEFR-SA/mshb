

## Apply Color Theme to All Components

### Problem
When a user selects a color theme (gradient background), several components have fully opaque backgrounds that block the gradient from showing through. The affected areas are:
1. Settings page cards (Profile, Theme, Color Themes)
2. Server Rail icon buttons
3. Search users input field (Inbox page)
4. "New Group" button (Inbox page)
5. Friends page tab bar (All Friends / Pending / Add Friend)
6. Text channel header bar
7. Text channel name container / channel sidebar

### Solution
Make backgrounds semi-transparent so the gradient shows through, while keeping them fully opaque when no color theme is active (default theme).

### Technical Approach

**1. Update `.glass` utility class** (`src/index.css`)
Change from `bg-card` to `bg-card/80` so cards become translucent over the gradient:
```css
.glass {
  @apply bg-card/80 backdrop-blur-sm border border-border/50;
}
```

**2. Update Settings page cards** (`src/pages/Settings.tsx`)
The three `<Card className="glass">` elements already use `.glass`, so they will automatically pick up the change from step 1.

**3. Update Server Rail** (`src/components/server/ServerRail.tsx`)
- Change the rail container from `bg-sidebar-background` to `bg-sidebar-background/80 backdrop-blur-sm`
- Change server icon buttons from `bg-sidebar-accent` to `bg-sidebar-accent/80`

**4. Update Search input and "New Group" button** (`src/pages/Inbox.tsx`)
- The `<Input>` component uses `bg-background` from its base class. Override with `bg-background/60 backdrop-blur-sm` on the search input.
- The "New Group" `<Button variant="outline">` will naturally become more transparent via the outline variant.

**5. Update Friends TabsList** (`src/pages/Friends.tsx`)
- The `<TabsList>` uses `bg-muted` by default. Override with `className="w-full bg-muted/60 backdrop-blur-sm"`.
- The active `TabsTrigger` uses `data-[state=active]:bg-background`; no change needed (it will be slightly transparent too).

**6. Update Channel header** (`src/components/server/ServerChannelChat.tsx`)
- The header already uses `glass` class, so it picks up the change from step 1.

**7. Update Channel Sidebar** (`src/components/server/ChannelSidebar.tsx`)
- Change container from `bg-sidebar-background` to `bg-sidebar-background/80 backdrop-blur-sm`

**8. Update Input base component** (`src/components/ui/input.tsx`)
- Change `bg-background` to `bg-background/60` so all inputs across the app become semi-transparent over gradients.

### Files Modified

| File | Changes |
|---|---|
| `src/index.css` | Update `.glass` to use `bg-card/80 backdrop-blur-sm` |
| `src/components/ui/input.tsx` | Change `bg-background` to `bg-background/60` |
| `src/components/server/ServerRail.tsx` | Semi-transparent rail and icon backgrounds |
| `src/components/server/ChannelSidebar.tsx` | Semi-transparent sidebar background |
| `src/pages/Friends.tsx` | Semi-transparent TabsList |
| `src/pages/Inbox.tsx` | Semi-transparent search input area |

