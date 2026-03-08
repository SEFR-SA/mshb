

## Unify Profile Card Sizes Across Three Components

### Reference (Single Source of Truth): ProfileTab.tsx Preview Card
- **Width**: `w-[300px]` (the parent container)
- **Banner**: `h-24` (96px)
- **Avatar**: `size={80}`, `h-20 w-20`, `border-4 border-background`
- **Avatar overlap**: `-mt-10`
- **Avatar StatusBadge**: `size="md"`, `ring-2 ring-background`
- **Card corners**: `rounded-xl`

### Changes

**1. `src/components/layout/UserPanelPopover.tsx`**

Current values → match to reference:
- Container: `w-[300px]` (already matches)
- Banner: `h-[60px]` → `h-24`
- Avatar: `size={48}`, `h-12 w-12`, `border-[3px] border-popover` → `size={80}`, `h-20 w-20`, `border-4 border-background`
- Avatar overlap: `-mt-6` → `-mt-10`
- StatusBadge: `size="sm"`, `ring-popover` → `size="md"`, `ring-background`
- Top corners: Add `rounded-t-xl` to the outer `div`

**2. `src/components/settings/DisplayNameStyleModal.tsx`**

Current values → match to reference:
- Container: `max-w-[260px]` → `max-w-[300px]`
- Banner: `h-20` → `h-24`
- Avatar: `size={56}`, `h-14 w-14`, `border-4` → `size={80}`, `h-20 w-20`, `border-4`
- Avatar overlap: `-mt-8` → `-mt-10`

### Files changed
| File | Change |
|------|--------|
| `src/components/layout/UserPanelPopover.tsx` | Update banner height, avatar size, overlap, status badge size, add rounded top corners |
| `src/components/settings/DisplayNameStyleModal.tsx` | Update card width, banner height, avatar size, overlap to match reference |

