

## Move Status Submenu Bottom-Aligned with UserPanel

### Change in `src/components/layout/UserPanelPopover.tsx`

**Line 145**: Change the anchor from `top-0` to `bottom-0` so the submenu aligns its bottom edge with the bottom of the status row (and thus the UserPanel). This replaces the negative margin approach entirely.

**Line 146**: Remove `-mt-6` since bottom-anchoring handles the positioning.

```
Line 145: top-0 → bottom-0
Line 146: -mt-6 → (remove)
```

