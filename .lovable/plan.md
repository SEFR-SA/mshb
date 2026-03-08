

## Fix: Display Name Style Drawer on Mobile

### Root Cause

On mobile, `DialogContent` renders as a `DrawerContent` (bottom sheet via vaul). However, the inner layout is entirely desktop-oriented:

1. **`w-[900px] max-w-[95vw]`** on the DialogContent — the drawer ignores width but the `max-w-[95vw]` gets inherited, potentially causing the right-side gap.
2. **`flex` row layout** with a **`w-[380px] shrink-0`** left pane — on a 390px screen this alone overflows, pushing the right preview pane off-screen and creating the gap/misalignment.
3. The **right preview pane** (`flex-1`) gets no space since the left pane consumes the full width.
4. The drawer's inner wrapper adds `px-5` padding (from `DrawerContent`), but the DialogContent uses `p-0` — these conflict.

### Fix

Restructure the mobile layout to be a **single-column vertical scroll** instead of side-by-side panes. The preview section moves below the controls.

**File: `src/components/settings/DisplayNameStyleModal.tsx`**

1. Import `useIsMobile` hook
2. On mobile: remove the fixed `w-[900px]` and `w-[380px]` widths, switch the body from `flex` (row) to `flex-col`, and make both panes full-width
3. Pass `raw` prop to DrawerContent (via DialogContent) to avoid double padding — actually, simpler: just reset the classes on mobile

**Specific changes:**

- **Line 136** — DialogContent className: Add responsive override
  - Desktop: keep `w-[900px] max-w-[95vw]`
  - Mobile: override to `w-full max-w-full max-h-full`

- **Line 138** — Body div: Change from `flex` (horizontal) to `flex-col` on mobile

- **Line 140** — Left pane: Remove `w-[380px] shrink-0 border-e` on mobile, use `w-full`

- **Line 209** — Right preview pane: On mobile, keep it full-width and give it a reasonable min-height instead of `flex-1`

### Implementation Detail

```tsx
// Add at top
import { useIsMobile } from "@/hooks/use-mobile";

// Inside component
const isMobile = useIsMobile();

// DialogContent
<DialogContent className={cn(
  "p-0 flex flex-col overflow-hidden gap-0",
  isMobile ? "w-full max-w-full" : "w-[900px] max-w-[95vw] max-h-[90vh]"
)}>

// Body div
<div className={cn("flex flex-1 overflow-hidden min-h-0", isMobile && "flex-col overflow-y-auto")}>

// Left pane
<div className={cn(
  "overflow-y-auto p-5 flex flex-col gap-5",
  isMobile ? "w-full" : "w-[380px] shrink-0 border-e border-border/50 p-6 gap-6"
)}>

// Right preview pane — hide on mobile to keep drawer compact
// (or show as a collapsed section)
```

On mobile, **hide the preview pane entirely** to keep the drawer usable — the preview cards are a luxury that doesn't fit a bottom sheet. The user can see the result after applying. This follows the app's pattern of compact mobile drawers.

### Files Changed
| File | Change |
|------|--------|
| `src/components/settings/DisplayNameStyleModal.tsx` | Add `useIsMobile`, restructure to single-column on mobile, hide preview pane, fix width classes |

