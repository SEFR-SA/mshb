

## Fix Status Submenu: Hover Contrast, Disappearing Menu, and Positioning

### Changes to `src/components/layout/UserPanelPopover.tsx`

**1. Add `hover:text-accent-foreground`** to each status option button (line 150) — same fix as the other buttons.

**2. Fix disappearing submenu** — The gap between the status row and the side menu (`ms-2`) creates a dead zone where `onMouseLeave` fires. Fix by adding an invisible bridge: replace `ms-2` with `ms-0` on the submenu container and add `ps-2` padding on a wrapper so the hover area is continuous.

**3. Move submenu up** — Change `top-0` to `top-[-8px]` (or `bottom-0` to anchor from bottom) so the last option isn't clipped by the viewport.

### Specific edits

- **Lines 144-164**: Wrap the submenu `div` in a bridge container:
```tsx
<div className="absolute left-full top-0 ms-0 rtl:left-auto rtl:right-full z-50 ps-2 rtl:ps-0 rtl:pe-2">
  <div className="w-[200px] rounded-md border border-border bg-popover/95 backdrop-blur-xl p-1 shadow-lg -mt-2">
    {STATUS_OPTIONS.map((opt) => (
      <button
        className={cn(
          "... hover:bg-accent hover:text-accent-foreground ...",
          currentStatus === opt.value && "bg-accent text-accent-foreground"
        )}
      >
        ...
        {opt.description && (
          <span className="... group-hover:text-accent-foreground">...</span>
        )}
      </button>
    ))}
  </div>
</div>
```

- Each status button gets `hover:text-accent-foreground` added to its className (already has `hover:bg-accent`)
- The description `span` inside each button uses the parent `group` + `group-hover:text-accent-foreground` pattern
- The active status item gets `text-accent-foreground` alongside `bg-accent`

