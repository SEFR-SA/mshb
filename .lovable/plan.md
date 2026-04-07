

## Fix Scrolling in Event Browser and Time Picker

### Root Cause

Radix UI's `ScrollArea` component intercepts wheel/touch events in a way that conflicts with Radix `Dialog` and `Popover` containers. This is a known issue — the scroll events get swallowed or propagated incorrectly, preventing actual scrolling of the content.

### Fix

Replace `ScrollArea` with native scrollable `div` elements (`overflow-y-auto`) in two locations. Native overflow scrolling works reliably inside Radix dialogs and popovers.

**1. `src/components/ui/date-time-picker.tsx` (line 90)**
```
// From:
<ScrollArea className="h-[300px] w-[120px] border-s border-border">

// To:
<div className="h-[300px] w-[120px] border-s border-border overflow-y-auto">
```
Remove the `ScrollArea` import.

**2. `src/components/server/events/EventBrowserModal.tsx` (line 183)**
```
// From:
<ScrollArea className="flex-1 -mx-6 px-6">

// To:
<div className="flex-1 -mx-6 px-6 overflow-y-auto">
```
Remove the `ScrollArea` import.

### Files

| File | Change |
|------|--------|
| `src/components/ui/date-time-picker.tsx` | Replace `ScrollArea` with native scrollable div |
| `src/components/server/events/EventBrowserModal.tsx` | Replace `ScrollArea` with native scrollable div |

### What stays untouched
- `CreateEventModal.tsx`, `ImageCropEditor.tsx`, `scroll-area.tsx` — no changes
- All event logic, date validation, frequency — untouched

