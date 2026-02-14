

## Hide Scrollbar Track, Show Only Thumb

### Problem
The `ScrollAreaScrollbar` element (the track) has a visible white/light background behind the gray thumb. We need to make the track fully transparent so only the moving thumb indicator is visible.

### Changes

**File: `src/components/ui/scroll-area.tsx`**

1. Add `bg-transparent` to the `ScrollAreaScrollbar` className to ensure the track has no background color
2. Optionally narrow the scrollbar width slightly (from `w-2.5` to `w-2`) for a subtler look
3. Ensure the thumb retains its `bg-border` color so it remains visible

| What | Detail |
|---|---|
| Track background | Add `bg-transparent` to the scrollbar track container |
| Track width | Optionally reduce from `w-2.5` to `w-2` for a cleaner look |
| Thumb | Keep `bg-border` on the thumb -- this is the gray moving indicator |

Single-file change affecting all scroll areas globally.

