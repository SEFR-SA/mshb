

## Fix: Native Color Picker Closes Drawer on Mobile

### Root Cause

The native `<input type="color">` opens a **system-level popup** outside the DOM. Vaul (the drawer library) detects interaction with this popup as an "outside click" and dismisses the drawer, which in turn destroys the color picker.

This is a known vaul limitation with native browser popups. The drawer itself is working correctly — the problem is specifically the native color picker triggering vaul's dismiss logic.

### Fix

**Hide `<input type="color">` on mobile.** Users already have two ways to pick colors: the swatch grid (9 presets) and the hex text input. The native color picker is a convenience on desktop but fundamentally incompatible with vaul's drawer on mobile.

**File: `src/components/settings/DisplayNameStyleModal.tsx`** — In the `ColorGrid` component, conditionally hide the `<input type="color">` when `isMobile` is true (the hook is already imported and used).

```tsx
// Line 122-128: Wrap with isMobile check
{!isMobile && (
  <input
    type="color"
    value={active}
    onChange={(e) => { ... }}
    className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent"
    title="Pick custom color"
  />
)}
```

One conditional wrapper. The hex text input remains, so users can still enter any custom color on mobile.

### Files Changed
| File | Change |
|------|--------|
| `src/components/settings/DisplayNameStyleModal.tsx` | Hide `<input type="color">` on mobile inside `ColorGrid` |

