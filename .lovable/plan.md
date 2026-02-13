
## Fix Status Badge Alignment in GroupMembersPanel

### Problem Analysis
The status badge in `GroupMembersPanel.tsx` (line 77) has a border wrapper that's not properly aligned with the status indicator circle. Currently:

- **StatusBadge component**: Renders a small circle (`h-2.5 w-2.5` for size="sm")
- **Border wrapper**: Uses `border-2 border-background rounded-full` to create a ring around it
- **Issue**: The border sizing and positioning is off, causing misalignment

Comparing with `UserProfilePanel.tsx` (line 42), which uses:
- `border-3 border-background rounded-full` for a larger badge (size="md": `h-3 w-3`)

### Root Cause
The `border-2` is too thin for the small badge size, and there's no padding between the badge and the border. The border needs sufficient padding/sizing to create a proper ring effect around the colored circle.

### Solution
Update the border wrapper in `GroupMembersPanel.tsx` to:
1. Add padding around the StatusBadge to create proper spacing between the circle and border
2. Adjust border sizing to match the badge dimensions better
3. Ensure the wrapper is properly sized to accommodate both the badge and the border

The fix will use `p-0.5` (padding) to create breathing room, ensuring the border sits cleanly around the status indicator.

### Changes Required

**File: `src/components/chat/GroupMembersPanel.tsx`** (Line 77)
- Replace: `<span className="absolute bottom-0 end-0 border-2 border-background rounded-full">`
- With: `<span className="absolute bottom-0 end-0 border-2 border-background rounded-full p-0.5">`

This adds internal padding that spaces the StatusBadge away from the border, creating a clean, aligned ring effect.

### Result
The status badge will now have a properly sized and aligned border that surrounds the colored circle without visual misalignment.
