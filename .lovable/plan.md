

## Clean Up Redundant Ring Overrides on StatusBadge

Now that `StatusBadge` has `ring-[3px] ring-background` built in, two call sites override it with a thinner `ring-2`. Removing these overrides lets the consistent Discord-style cut-out apply everywhere.

### Changes

**1. `src/components/layout/UserPanelPopover.tsx` (line 97)**
- Remove `ring-2 ring-background` from the className prop
- Keep `absolute bottom-0 end-0 z-20`

**2. `src/components/settings/tabs/ProfileTab.tsx` (line 320)**
- Remove `ring-2 ring-background` from the className prop
- Keep `absolute bottom-0 end-0 z-20`

Both will then use the default `ring-[3px] ring-background` from `StatusBadge.tsx`.

