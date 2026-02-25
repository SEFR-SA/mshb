

## Fix: Server Member Profile Card Not Visible on Mobile

### Problem
The member profile card uses a `Popover` with `side="left"`, which gets clipped or hidden on mobile screens since there's not enough horizontal space. The popover positioning doesn't adapt to small viewports.

### Solution
On mobile, replace the `Popover` with a `Dialog` that renders as a centered modal overlay. On desktop, keep the existing `Popover` behavior unchanged.

### File: `src/components/server/ServerMemberList.tsx`

1. **Import additions**: Add `useIsMobile` hook, and import `Dialog`, `DialogContent`, `DialogTitle` from the UI components.

2. **Add state**: Track which member's profile dialog is open via `selectedMemberId` state.

3. **Conditional rendering per member** (lines 151-244):
   - **Desktop**: Keep the existing `Popover` + `PopoverTrigger` + `PopoverContent` as-is.
   - **Mobile**: Replace with a `Dialog` that opens `onOpenChange` when the member button is clicked. The `DialogContent` will contain the same profile card content (banner, avatar, name, role badge, about me, dates, quick message input) styled identically, centered on screen.

4. **Extract profile card content**: To avoid duplicating the card JSX, extract the inner card content (lines 178-242) into a local `ProfileCardContent` component that accepts `m` (member), `p` (profile), `name`, `username`, `status` as props, and reuse it in both the Popover and Dialog.

### Structure

```text
Member button click
├── Desktop (useIsMobile = false)
│   └── Popover (side="left") — existing behavior
└── Mobile (useIsMobile = true)
    └── Dialog (centered modal)
        └── DialogContent with profile card
```

### Changes Summary

| File | Change |
|------|--------|
| `src/components/server/ServerMemberList.tsx` | Add mobile Dialog for profile card, extract shared card content, conditionally render Popover vs Dialog |

