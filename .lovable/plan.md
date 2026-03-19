

## Problem

1. Container 1 and Container 2 need fixed sizes (268x99 and 268x50) and centered content
2. The popover width should be 300px (already is)
3. Text in the containers is hard to read on light themes like Sado because `bg-muted/50` is semi-transparent over the gradient, and the text uses theme colors that blend in

## Fix

**File: `src/components/layout/UserPanelPopover.tsx`**

### Container sizing and centering
- **Container 1** (line 129): Change to `w-[268px] h-[99px] mx-auto` with `flex flex-col justify-center` and `items-center` on the outer div, keeping inner buttons full-width
- **Container 2** (line 211): Change to `w-[268px] h-[50px] mx-auto` with `flex flex-col justify-center`

### Readability fix for light themes
- Replace `bg-muted/50` on both containers with `bg-black/40 backdrop-blur-sm` — this ensures consistent dark backing against the gradient regardless of theme, making white/light text always readable (matching Discord's dark popover style)
- Change button text colors to use `text-white/80 hover:text-white` instead of relying on theme tokens (`text-accent-foreground`, `text-muted-foreground`) that become invisible on light themes
- Change hover backgrounds to `hover:bg-white/10` instead of `hover:bg-accent`
- Sign Out button: `text-red-400 hover:bg-red-500/20 hover:text-red-300`

This makes the containers theme-agnostic since they sit on top of a dark gradient wash — text will always be legible.

