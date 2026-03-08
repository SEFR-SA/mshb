

## Fix Hover Text Contrast in UserPanelPopover

The issue: when hovering over "Edit Profile", "Online", and status options, the `hover:bg-accent` background changes but the text color stays the same, making it hard to read depending on the active theme.

### Solution

Add `hover:text-accent-foreground` to all interactive buttons in the popover. Tailwind already maps `accent-foreground` from the theme's `--accent-foreground` CSS variable, which the theme engine sets to a contrasting color for each theme. This is the correct SSOT approach — no custom formula needed since the theme engine already computes proper foreground colors for the accent background.

### Changes to `src/components/layout/UserPanelPopover.tsx`

| Line(s) | Current | Change |
|---------|---------|--------|
| 119 | `hover:bg-accent` | `hover:bg-accent hover:text-accent-foreground` |
| 133 | `hover:bg-accent` | `hover:bg-accent hover:text-accent-foreground` |
| 150 | `hover:bg-accent` | `hover:bg-accent hover:text-accent-foreground` |
| 172 | `hover:bg-accent` | `hover:bg-accent hover:text-accent-foreground` (keep `text-destructive` for non-hover via group or ordering) |

For the Sign Out button (line 172), use `hover:bg-destructive hover:text-destructive-foreground` instead to keep it visually distinct.

Also add `hover:text-accent-foreground` to the chevron on line 140 by changing `text-muted-foreground` to include the group hover pattern: wrap the status button in a `group` and use `group-hover:text-accent-foreground` on the chevron.

