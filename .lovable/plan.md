

## Plan: Toggle Chevron Direction on Popover Open

Swap `ChevronDown` for `ChevronUp` when the corresponding popover is open, using the existing `micPopoverOpen` and `speakerPopoverOpen` state.

### Changes

**`src/components/layout/UserPanel.tsx`**

1. Add `ChevronUp` to the lucide-react import.
2. Line 114: Replace `<ChevronDown .../>` with `{micPopoverOpen ? <ChevronUp .../> : <ChevronDown .../>}`.
3. Line 126: Replace `<ChevronDown .../>` with `{speakerPopoverOpen ? <ChevronUp .../> : <ChevronDown .../>}`.

That's it — no new files, no structural changes.

