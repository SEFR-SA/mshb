

## Fix: Dropdown Menu & Start Button Issues in Event Cards

### Bug 1: Dropdown Menu Not Visible

**Root cause:** The `DropdownMenuContent` portals to document body at `z-50` (default). But the Dialog overlay and content sit at `z-[10000]`. The dropdown renders *behind* the dialog — it opens but is invisible.

**Fix in `EventCard.tsx`:** Add `className="z-[10001]"` to `<DropdownMenuContent>` so it renders above the dialog layer. This follows the existing project convention noted in the codebase (SelectContent uses `z-[10001]` for the same reason).

### Bug 2: Start Button Doesn't Close Modal or Navigate

**Root cause:** In `handleConfirmAction` (EventBrowserModal.tsx), after updating the event status and calling `setVoiceChannel` + `navigate`, the code never calls `onOpenChange(false)` to close the Events dialog. The dialog stays open, blocking the navigation visually.

**Fix in `EventBrowserModal.tsx`:** After a successful "start" action, call `onOpenChange(false)` before navigating. This closes the dialog and allows the user to see the voice channel they've been routed to.

### Changes

**File: `src/components/server/events/EventCard.tsx`**
- Line 175: Add `className="z-[10001]"` to `<DropdownMenuContent>`

**File: `src/components/server/events/EventBrowserModal.tsx`**
- In `handleConfirmAction`, after the successful start branch (line ~192), add `onOpenChange(false)` before the voice join + navigate block

### What stays untouched
- Date/time logic, frequency, CreateEventModal, ImageCropEditor — all unchanged

