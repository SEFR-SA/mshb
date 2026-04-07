

## Fix: Start Event Confirmation Dialog Trapped Behind Modal

### Root Cause

The `AlertDialog` (confirmation for Start/Cancel) uses `z-50` for both its overlay and content. The parent `Dialog` (Event Browser) uses `z-[10000]`. The AlertDialog renders *behind* the Dialog — the user sees the overlay darken but the actual confirmation buttons are invisible and unreachable. This also blocks closing the parent Dialog since the AlertDialog's overlay captures all clicks.

### Fix

**File: `src/components/server/events/EventBrowserModal.tsx`**

Pass `className="z-[10002]"` to `AlertDialogContent` and update the `AlertDialogOverlay` z-index indirectly by passing a className override on `AlertDialogContent`. Since `AlertDialogContent` includes `AlertDialogOverlay` internally, we need to update the `alert-dialog.tsx` component's z-indices.

**Simpler approach — File: `src/components/ui/alert-dialog.tsx`**

Update the `AlertDialogOverlay` from `z-50` to `z-[10001]` and `AlertDialogContent` from `z-50` to `z-[10001]`. This matches the convention already used for `DropdownMenuContent` and keeps the AlertDialog above all Dialog layers.

This is safe because AlertDialogs are always top-priority confirmation dialogs that should appear above everything else.

### Changes

| File | Change |
|------|--------|
| `src/components/ui/alert-dialog.tsx` | Line 19: `z-50` → `z-[10001]`; Line 37: `z-50` → `z-[10001]` |

### What stays untouched
- EventBrowserModal.tsx, EventCard.tsx, CreateEventModal.tsx — no changes
- All event logic, date/time, frequency — untouched

