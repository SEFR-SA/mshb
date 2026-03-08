

## Fix: Color Picker Closing Modal on All Platforms

### Root Cause

The `<input type="color">` (line 122-128 in `DisplayNameStyleModal.tsx`) opens a native OS color picker. On **all platforms** (not just mobile), pointer/mouse events from this picker bubble up to the parent `Dialog`/`Drawer`, which interprets them as outside clicks and closes the modal.

### Fix

**File: `src/components/settings/DisplayNameStyleModal.tsx`**

Add `stopPropagation` on pointer, mouse, and touch events to the `<input type="color">` element inside `ColorGrid` (line 122-128):

```tsx
<input
  type="color"
  value={active}
  onChange={(e) => { ... }}
  onPointerDown={(e) => e.stopPropagation()}
  onMouseDown={(e) => e.stopPropagation()}
  onTouchStart={(e) => e.stopPropagation()}
  className="h-6 w-6 rounded cursor-pointer border-0 bg-transparent"
  title="Pick custom color"
/>
```

This prevents the native color picker interaction from being misinterpreted as an "outside click" by Radix Dialog / vaul Drawer on desktop, tablet, and mobile alike.

### Files Changed
| File | Change |
|------|--------|
| `src/components/settings/DisplayNameStyleModal.tsx` | Add `onPointerDown`, `onMouseDown`, `onTouchStart` with `stopPropagation()` to `<input type="color">` in `ColorGrid` |

