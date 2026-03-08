

## Fix: Symmetric Mobile Margins on Profile Settings Page

### Root Cause

The content wrapper in `SettingsModal.tsx` (line 254) uses `px-4 sm:px-8` which is symmetric. However, the scrollable container (line 253) uses `overflow-y-auto`, which on non-overlay-scrollbar environments (desktop browsers, Electron, some Android WebViews) renders a visible scrollbar that eats ~15-17px from the **right** (or **end**) side. This creates an asymmetric appearance where the right padding appears larger than the left.

Additionally, on the **Profile tab specifically**, the right-column preview section (line 330: `w-full lg:w-[300px] shrink-0`) on mobile stacks below the form but retains `shrink-0`, which in certain flex scenarios can cause subtle width calculation issues.

### Changes

**1. `src/components/settings/SettingsModal.tsx`** — Fix scrollbar-induced asymmetry

Line 253 — add `scrollbar-gutter: stable` to the scrollable container so the gutter space is always reserved symmetrically, preventing layout shift when content overflows:

```tsx
// Line 253: add inline style for scrollbar gutter
<div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarGutter: "stable" }}>
```

This reserves space for the scrollbar even when it's not visible, keeping content centered. Combined with `px-4`, the padding remains equal on both sides.

**2. `src/components/settings/tabs/ProfileTab.tsx`** — Clean up right-column flex on mobile

Line 330 — remove `shrink-0` from the preview column (it's only needed on desktop `lg:` to prevent the column from shrinking):

```tsx
// Before
<div className="w-full lg:w-[300px] shrink-0 sticky top-6 self-start space-y-4">

// After  
<div className="w-full lg:w-[300px] lg:shrink-0 sticky top-6 self-start space-y-4">
```

This ensures the preview column doesn't interfere with flex width calculations on mobile.

**3. RTL audit** — Both files already use logical properties correctly (`end-4`, `pe-10`, `border-e`). No legacy `ml-`/`pr-` directional classes found in the affected containers.

### Files Changed
| File | Line | Change |
|------|------|--------|
| `src/components/settings/SettingsModal.tsx` | 253 | Add `style={{ scrollbarGutter: "stable" }}` to scrollable container |
| `src/components/settings/tabs/ProfileTab.tsx` | 330 | Change `shrink-0` to `lg:shrink-0` on preview column |

