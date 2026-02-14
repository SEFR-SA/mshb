

## Fix Messages and Friends Icon Alignment and Container Styling

### Problem
The Messages and Friends icons at the top of the Server Rail appear without a visible container background and look misaligned compared to the Create Server (+) and Join Server buttons below, even though they share similar CSS classes.

### Solution
Ensure the Messages and Friends NavLink buttons have explicit background styling that matches the Create/Join buttons visually. The fix is in the inactive state class -- make sure it renders a visible container background identical to the other buttons.

### Changes

**`src/components/server/ServerRail.tsx`**

Update lines 59-62 (Messages button) and 75-78 (Friends button) to ensure their className exactly matches the styling of the Create and Join buttons below. The key fix is ensuring `bg-sidebar-accent` is consistently applied and the buttons are properly centered within the 72px rail:

- Messages button (line 60-61): Keep the `w-12 h-12 rounded-2xl` sizing and add consistent background
- Friends button (line 76-77): Same treatment

Both buttons should use the exact same inactive state styling: `bg-sidebar-accent text-sidebar-foreground hover:bg-primary/20 hover:text-primary hover:rounded-xl` -- note the `hover:text-primary` which the Create/Join buttons have but the nav buttons are missing.

### Files Modified
- `src/components/server/ServerRail.tsx` -- add `hover:text-primary` to Messages and Friends button inactive states to match Create/Join button styling exactly

