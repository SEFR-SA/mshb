

## Badge Size Fix — "Twisted Minds" Visibility

### Problem
The badge icon inside the server tag pill (next to usernames in chat) uses `h-3 w-3` (12×12px). Simple Lucide icons (skull, flame) read fine at that size, but complex pixel-art SVGs like TwistedMindsBadge have too much detail to be legible.

### Approach
Increase the badge size from `h-3 w-3` to `h-4 w-4` (16×16px) everywhere the server tag badge renders. This is a ~33% increase — enough to make complex badges legible without breaking the tag pill layout.

### Files to Change

1. **`src/components/ServerTagBadgeIcon.tsx`** — Change default className from `"h-3 w-3"` to `"h-4 w-4"`
2. **`src/components/StyledDisplayName.tsx`** — Change the `className="h-3 w-3"` passed to `ServerTagBadgeIcon` to `"h-4 w-4"`
3. **`src/components/server/settings/ServerTagTab.tsx`** — Change the tag preview badge from `"h-3 w-3"` to `"h-4 w-4"` (line 180)

The settings grid already uses `h-5 w-5` for the picker buttons, so those stay as-is.

