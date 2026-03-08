

## Fix Popover Centering & Edge Collision

### Root Cause
The `PopoverTrigger` only wraps the avatar+name button (left side of the panel). The audio controls sit outside. So `align="center"` centers on that narrow trigger -- not the full UserPanel width. This makes the popover lean right and potentially touch the page edge.

### Fix (single file: `src/components/layout/UserPanel.tsx`)

1. **Move `Popover` + `PopoverTrigger` to wrap the entire panel row** (avatar + name + audio controls), so the popover centers relative to the full width. The click-to-open behavior stays on just the avatar/name area via `e.stopPropagation` or by keeping the trigger on the outer container but making the audio buttons stop propagation.

   Actually, simpler approach: Keep trigger as-is but use `align="center"` with `alignOffset` to shift it left, **or** better yet -- add `collisionPadding` to prevent edge touching and use CSS to position relative to the full parent.

   **Simplest correct fix**: On `PopoverContent`, add `collisionPadding={8}` to prevent edge-touching, and set `align="start"` with `alignOffset` calculated to visually center over the full panel. But this is fragile.

   **Best fix**: Wrap the entire `<div className="flex items-center gap-2 p-2">` row inside the `PopoverTrigger`, but make the audio buttons use `onPointerDown={(e) => e.stopPropagation()}` so clicking them doesn't toggle the popover. This way `align="center"` truly centers over the full panel width.

2. Add `collisionPadding={8}` on `PopoverContent` to prevent touching the viewport edge.

### Changes in `src/components/layout/UserPanel.tsx`

- Restructure so `PopoverTrigger` wraps the full row (`flex items-center gap-2 p-2`)
- Audio control buttons get `onPointerDown={e => e.stopPropagation()}` and `onClick={e => e.stopPropagation()}` to prevent them from triggering the popover
- Add `collisionPadding={8}` to `PopoverContent`

