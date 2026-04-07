

## Fix: Event Cancellation Enum Mismatch

### Root Cause

The database `event_status` enum has the value `canceled` (American spelling, single 'l'), but the code in `EventBrowserModal.tsx` sends `cancelled` (British spelling, double 'l'). Postgres rejects the unknown enum value.

### Fix

**File: `src/components/server/events/EventBrowserModal.tsx`**

Change `"cancelled"` to `"canceled"` on the line that updates the event status (~line 205).

That single character fix resolves the error. The event will then be removed from the list by the existing `prev.filter` logic on the next line.

### What stays untouched
- Everything else — EventCard, CreateEventModal, ImageCropEditor, ServerRail, date/time logic

