

## Edge-to-Edge Mobile Profile Drawer

### Problem
The `DrawerContent` component (drawer.tsx) has a built-in drag handle and inner padding wrapper (`px-5 pb-5`) that prevents the banner from bleeding to the edges. The banner also has `rounded-t-lg` adding unwanted rounding.

### Files to Change

**1. `src/components/ui/drawer.tsx`** — Make the drag handle and inner padding optional via a `raw` prop:
- Add a `raw?: boolean` prop to `DrawerContent`
- When `raw` is true: skip the drag handle div and the inner padding wrapper div, render `{children}` directly
- When `raw` is false (default): keep existing behavior — no breaking changes for other drawers

**2. `src/components/UserProfileModal.tsx`** — Use `raw` mode and fix banner styling:
- Pass `<DrawerContent raw>` for both the loading and content mobile renders (lines 186, 202)
- Remove `rounded-t-lg` from the banner div (line 91) — the drawer's `rounded-t-[24px]` handles the corner rounding
- Add `overflow-hidden` to DrawerContent so the banner clips to the rounded corners
- The avatar section (`px-4 -mt-10`) and info section (`px-4 pt-2 pb-4`) already have their own padding, so no additional wrapper needed

### Result
- No drag handle pill visible
- Banner stretches edge-to-edge, flush with the top and sides of the drawer
- Content below the banner retains its existing padding
- All other drawers in the app remain unchanged

