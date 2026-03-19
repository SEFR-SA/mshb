

## Investigation Results

The status submenu on desktop is positioned absolutely with `left-full` (outside the parent container). However, the root `div` on line 77 of `UserPanelPopover.tsx` has `overflow-hidden`, which clips anything that extends beyond its bounds — making the submenu invisible.

## Fix

**File: `src/components/layout/UserPanelPopover.tsx` (line 77)**

Change `overflow-hidden` to `overflow-visible` on the root container. The `rounded-xl` border-radius clipping for the banner/gradient layers is already handled by the inner elements' own styling, so removing `overflow-hidden` from the root won't break the visual appearance — the absolute-positioned gradient and dark wash layers are constrained by `inset-0`.

Single-line change:
```
- className="relative w-[308px] min-h-[391px] overflow-hidden rounded-xl"
+ className="relative w-[308px] min-h-[391px] overflow-visible rounded-xl"
```

To preserve the rounded corners on the banner/gradient layers that relied on the parent's `overflow-hidden`, add `rounded-xl` to the two absolute background layers (L1 gradient and L2 dark wash) so they clip themselves.

