

## Issue: Color Picker Closes the Drawer on Mobile

### Root Cause

On mobile, the `Dialog` component renders as a **vaul `Drawer`** (bottom sheet). Vaul listens for downward drag/touch gestures on its content to dismiss the drawer. When you interact with the native `<input type="color">` picker, vaul interprets the touch interaction (especially sliding on the color spectrum/hue slider) as a **swipe-to-dismiss gesture**, immediately closing the drawer.

This is a well-known vaul issue with interactive elements like sliders, color pickers, and range inputs.

### Fix

Wrap the `<input type="color">` element with the `data-vaul-no-drag` attribute. This is vaul's built-in escape hatch — it tells the drawer to **ignore drag events** originating from that element, preventing accidental dismissal.

### Change

**File: `src/components/settings/DisplayNameStyleModal.tsx`** — line 122

Add `data-vaul-no-drag` to the color input:

```tsx
<input
  type="color"
  data-vaul-no-drag
  value={active}
  onChange={...}
  ...
/>
```

One attribute addition in the `ColorGrid` component. No other files need changes.

