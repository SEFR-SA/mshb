

## Hide Scrollbar Track Globally

### Problem
The scroll area shows a visible track/container behind the scrollbar thumb. The user wants to hide the track and only show the moving thumb indicator across all pages.

### Changes

**File: `src/components/ui/scroll-area.tsx`**

Update the `ScrollBar` component to make the track background transparent by removing the border and padding styles, so only the thumb (the moving indicator) is visible.

| What | Detail |
|---|---|
| Remove track styling | Remove `border-l border-l-transparent p-[1px]` from vertical and `border-t border-t-transparent p-[1px]` from horizontal orientations |
| Make track invisible | The track container becomes fully transparent, leaving only the rounded thumb visible |

This is a single-file change that affects all scroll areas app-wide since every `ScrollArea` uses this shared component.

