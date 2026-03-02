

## Mobile Layered Surface Fix

### Problem
On desktop, `AppLayout.tsx` (line 77-78) renders `<ServerRail />` outside `<main className="bg-surface rounded-tl-[16px]">`, creating the layered illusion. On mobile, `AppLayout` skips the ServerRail (`!isMobile && <ServerRail />`), and `ServerView` renders both `<ServerRail />` and `<ChannelSidebar>` **inside** `<main>` — so they share `bg-surface` with no contrast, and the rounded corner sits above them (on the `<main>` wrapper) where it's invisible.

### Solution
Apply the layered surface pattern directly inside `ServerView`'s mobile layout (Phase 1), since that's where the Rail + Content sit side-by-side on mobile.

### Changes

**File: `src/pages/ServerView.tsx` — Mobile Phase 1 (lines 164-179)**

Current:
```tsx
<div className="flex h-full w-full max-w-full overflow-x-hidden">
  <ServerRail />
  <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col">
    ...
    <ChannelSidebar ... />
  </div>
</div>
```

Change to:
```tsx
<div className="flex h-full w-full max-w-full overflow-x-hidden bg-background">
  <ServerRail />
  <div className="flex-1 min-h-0 min-w-0 overflow-hidden flex flex-col bg-surface rounded-tl-[16px]">
    ...
    <ChannelSidebar ... />
  </div>
</div>
```

- Outer wrapper gets `bg-background` — the darker canvas color that matches the Server Rail
- Content wrapper gets `bg-surface rounded-tl-[16px]` — the lighter card with the rounded corner, identical to desktop's `<main>`

That's it. Two classes on the outer div, two classes on the inner div. The ServerRail already has no explicit background (inherits from parent), so it will sit on the darker `bg-background` canvas naturally.

### What This Achieves
| Aspect | Before | After |
|--------|--------|-------|
| Rail vs Content contrast | Same color | Dark rail / light content |
| Rounded corner | Not visible | `rounded-tl-[16px]` on content card |
| Desktop | Unchanged | Unchanged |

