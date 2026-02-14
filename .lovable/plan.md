

## Fix Mobile Sidebar Transparency and Remove Duplicate Settings Icon

### Problem
1. The mobile slide-out Server Rail sidebar (Sheet) has a solid background instead of the transparent glassmorphism style used elsewhere in the app.
2. The mobile bottom nav has both a Settings icon and a Profile avatar icon, but they both navigate to `/settings` -- redundant.

### Changes

**File: `src/components/layout/AppLayout.tsx`**

1. **Fix sidebar transparency**: Update the `SheetContent` on line 75 to add transparency classes matching the app's glassmorphism style (`bg-sidebar-background/30 backdrop-blur-sm` instead of the default solid `bg-background`).

2. **Remove Settings from navItems**: Remove the Settings entry from the `navItems` array (line 50) so only Messages and Friends remain in the bottom nav alongside the Profile avatar. The Profile avatar already links to `/settings`.

| Change | Detail |
|---|---|
| Line 50 | Remove `{ to: "/settings", icon: Settings, ... }` from `navItems` |
| Line 75 | Add `bg-sidebar-background/30 backdrop-blur-sm` classes to `SheetContent` and override the default background |

