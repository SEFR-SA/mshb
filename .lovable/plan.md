

## Fix: Mobile Home View Surface Color Separation

### Problem
On mobile **Server View** (line 166-168 of `ServerView.tsx`), the layout correctly applies `bg-background` on the outer container and `bg-surface rounded-tl-[16px]` on the ChannelSidebar wrapper, creating a visible depth hierarchy between the Rail and the sidebar.

On mobile **Home View** (line 52-60 of `HomeView.tsx`), the HomeSidebar wrapper has **no background class at all** — it inherits `bg-surface` from AppLayout's `<main>`, making the Rail and sidebar appear flush with the same color.

### Fix
**File: `src/pages/HomeView.tsx`** — line 55

Change the HomeSidebar wrapper div from:
```tsx
<div className="flex-1 flex flex-col overflow-hidden min-w-0">
```
to:
```tsx
<div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-surface rounded-tl-[16px]">
```

This mirrors the exact same pattern used in `ServerView.tsx` line 168, giving the HomeSidebar the lighter `bg-surface` layer with the signature rounded top-left corner, while the ServerRail behind it stays on the darker `bg-background`.

### Files Changed
| File | Change |
|------|--------|
| `src/pages/HomeView.tsx` line 55 | Add `bg-surface rounded-tl-[16px]` to the HomeSidebar wrapper div |

One line change. No new CSS variables or Tailwind config changes needed — just matching the existing ServerView pattern.

