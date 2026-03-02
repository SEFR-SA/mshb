

## Root Cause Analysis

The problem is **not** in `ServerSettingsDialog.tsx` itself. It's in our shared `Dialog` component (`src/components/ui/dialog.tsx`).

**Lines 66-74** of `dialog.tsx` auto-switch ALL `Dialog` components to a Vaul `Drawer` (bottom sheet) on mobile:

```typescript
const Dialog: React.FC<DialogProps> = ({ children, ...props }) => {
  const isMobile = useIsMobile();
  if (isMobile) {
    return <Drawer {...props}>{children}</Drawer>;  // ← every Dialog becomes a bottom sheet
  }
  return <DialogPrimitive.Root {...props}>{children}</DialogPrimitive.Root>;
};
```

This means `DialogContent` renders `DrawerContent` on mobile, which brings the drag handle, rounded top corners, bottom-anchored positioning, and swipe-to-dismiss behavior.

**Why Profile Settings is unaffected:** `SettingsModal` does NOT use the `Dialog` component at all. It renders a manual `fixed inset-0` full-screen overlay, completely bypassing the Dialog→Drawer auto-switch.

**Why Server Settings is affected:** `ServerSettingsDialog` uses `<Dialog>` + `<DialogContent>`, which on mobile becomes `<Drawer>` + `<DrawerContent>` — a bottom sheet with drag handle and gaps.

### The Fix

The `ServerSettingsDialog` already applies `max-w-none w-screen h-screen m-0 p-0 rounded-none border-none` to its `DialogContent`, clearly intending a full-screen takeover. The Drawer wrapper fights against these classes.

**The cleanest solution:** Convert `ServerSettingsDialog` to use the same manual full-screen overlay pattern as `SettingsModal`, completely bypassing the `Dialog` component. This avoids modifying the shared `dialog.tsx` (which would affect 18+ other files that legitimately want the Drawer behavior on mobile).

### Changes

**File: `src/components/server/ServerSettingsDialog.tsx`**

Replace the `Dialog`/`DialogContent` wrapper (lines 217-275) with a conditional render pattern identical to `SettingsModal`:

- When `open` is false, render nothing
- When `open` is true, render a `fixed inset-0 z-50` full-screen div
- Keep the backdrop, the flex layout, the desktop sidebar, mobile header, and content area exactly as they are
- Remove the `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` imports and usage
- Keep the `Sheet` import (it's used for the mobile sidebar navigation hamburger menu, which is correct)

The result: Server Settings will render as a full-screen, edge-to-edge overlay on both desktop and mobile — identical to Profile Settings. No Drawer, no drag handle, no bottom sheet, no edge gaps.

### What Changes

| Aspect | Before | After |
|--------|--------|-------|
| Mobile wrapper | Vaul Drawer (bottom sheet) | Full-screen fixed overlay |
| Drag handle | Visible | Gone |
| Edge gaps | Left/right gaps from Drawer | Edge-to-edge |
| Desktop | Full-screen Dialog | Full-screen fixed overlay (visually identical) |
| ESC to close | Via Dialog primitive | Manual keydown listener (same as SettingsModal) |

### What Does NOT Change

- No changes to `dialog.tsx` — other dialogs keep their Drawer behavior
- No changes to any other component
- The mobile sidebar navigation (hamburger → Sheet) stays exactly the same
- All tab content, data loading, delete confirmation remain untouched

