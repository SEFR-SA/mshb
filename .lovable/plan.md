

## Remove Status Badge Wrapper from All Pages

The `<span>` wrapper elements that create a border ring around the `StatusBadge` component will be removed from every file. The `StatusBadge` itself will remain -- only the surrounding `<span>` with `border-*` classes is removed.

### Files to Modify

**1. `src/components/chat/GroupMembersPanel.tsx`** (line 77-79)
- Remove the wrapper `<span>` with `border-2 border-background rounded-full p-0.5`
- Keep `<StatusBadge status={displayStatus} />` directly inside the `<div className="relative shrink-0">`

**2. `src/components/chat/UserProfilePanel.tsx`** (line 42-44)
- Remove the wrapper `<span>` with `border-3 border-background rounded-full`
- Keep `<StatusBadge status={status} size="md" />` directly

**3. `src/pages/Chat.tsx`** (line 222-224)
- Remove the wrapper `<span>` with `border-2 border-background rounded-full`
- Keep `<StatusBadge>` directly

**4. `src/pages/Friends.tsx`** (line 191-193)
- Remove the wrapper `<span>` with `border-2 border-background rounded-full`
- Keep `<StatusBadge>` directly

**5. `src/pages/Inbox.tsx`** (lines 259-261 and 299-301)
- Remove both wrapper `<span>` elements
- Keep `<StatusBadge>` directly in both places

**6. `src/components/chat/ChatSidebar.tsx`** (has similar wrapper)
- Remove the wrapper `<span>`
- Keep `<StatusBadge>` directly

In all cases, the `<StatusBadge>` will be placed directly inside the positioning `<div>` or at the same location, just without the border ring wrapper. The absolute positioning classes will move to the `StatusBadge` itself via its `className` prop (e.g., `className="absolute bottom-0 end-0"`).

