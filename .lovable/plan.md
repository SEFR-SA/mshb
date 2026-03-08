

## Fix: Status Submenu Alignment on Mobile

### Problem
The status submenu in UserPanelPopover uses `absolute left-full` positioning — it flies off-screen to the right on mobile where there's no room.

### Solution
On mobile, render the status options **inline** (expanded below the status row) instead of as a side-positioned submenu. On desktop, keep the existing side submenu.

### Changes

**`src/components/layout/UserPanelPopover.tsx`**:
1. Import `useIsMobile` from `@/hooks/use-mobile`
2. On mobile: replace the `absolute left-full` submenu with an inline expanded list below the status button (no absolute positioning, no overflow issues)
3. On desktop: keep the current side-positioned submenu unchanged
4. On mobile, replace `ChevronRight` with `ChevronDown`/`ChevronUp` to indicate expand/collapse

```tsx
// Mobile: inline dropdown
{showStatusMenu && isMobile && (
  <div className="mt-0.5 rounded-md border border-border bg-popover/95 backdrop-blur-xl p-1 space-y-0.5">
    {STATUS_OPTIONS.map(...)}
  </div>
)}

// Desktop: side submenu (existing code, unchanged)
{showStatusMenu && !isMobile && (
  <div className="absolute left-full bottom-0 ...">...</div>
)}
```

One file changed, ~10 lines modified.

