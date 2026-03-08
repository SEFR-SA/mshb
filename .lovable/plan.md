

## Discord-Style Status Badge: Overlap + Cut-out Border

### Problem
StatusBadge sits flush on the edge (`bottom-0 end-0`) with no border cut-out. Discord's style has the badge slightly overlapping the avatar with a thick background-colored ring that "punches through" the avatar.

### SSOT Approach
The fix goes **entirely inside `StatusBadge` itself** — add `ring-[3px] ring-background` as default styling. The positioning is already handled by each call site via `className`, but most use `bottom-0 end-0` which is correct for the overlap effect once the ring is added (the ring extends outward, creating the visual overlap).

### Changes

**File: `src/components/StatusBadge.tsx`**

Add `ring-[3px] ring-background` to the base classes of the badge. This single change applies the cut-out border everywhere StatusBadge is used (10+ locations), maintaining SSOT.

```tsx
export function StatusBadge({ status, size = "sm", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full inline-block shrink-0 ring-[3px] ring-background",
        size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3",
        statusColors[status] || statusColors.online,
        className
      )}
    />
  );
}
```

**Note:** One call site (`ProfileTab.tsx` line 320) already has `ring-2 ring-background` in its className — that will be redundant but harmless (the base `ring-[3px]` will be overridden by the more specific `ring-2` there, or we can remove it for cleanliness).

### Why this works
- The `ring` in Tailwind renders as a `box-shadow`, which extends **outside** the element without affecting layout
- Combined with `bottom-0 end-0` positioning inside the `AvatarDecorationWrapper` (which has `position: relative`), the badge overlaps the avatar's corner
- `ring-background` matches the container color, creating the Discord "cut-out" illusion
- Single change, 10+ locations fixed

