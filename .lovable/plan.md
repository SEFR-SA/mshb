

## Discord-style UserPanel Popover

### What changes

Replace the current `NavLink to="/settings"` click behavior on the avatar/name area in `UserPanel` with a **Popover** that appears above the panel, matching the Discord reference image.

### Popover Content (top to bottom)

1. **Banner** -- user's `banner_url` or gradient fallback (small, ~60px tall)
2. **Avatar** -- with decoration wrapper, overlapping banner (~48px, `-mt-6`)
3. **Display name** (styled) + **@username**
4. **Separator**
5. **Edit Profile** button -- navigates to `/settings` (Profile tab)
6. **Status selector row** -- shows current status with colored dot + label. Clicking opens a submenu/popover listing: Online, Idle, Busy (DND), Invisible. Selecting one updates `profiles.status` via Supabase immediately and refreshes profile.
7. **Switch Accounts** button -- since multi-account isn't implemented, this will sign out (matching the only viable action), or we can show it disabled/greyed out with a "Coming Soon" tooltip.

### Implementation

**New file: `src/components/layout/UserPanelPopover.tsx`**
- Renders `Popover` from Radix with `side="top"` and `align="start"`
- Contains the banner, avatar, name, Edit Profile button, status quick-switcher, and Switch Accounts
- Status change: `supabase.from("profiles").update({ status }).eq("user_id", user.id)` then `refreshProfile()`
- Uses existing shared components: `AvatarDecorationWrapper`, `StyledDisplayName`, `StatusBadge`, `ProfileEffectWrapper`

**Edit: `src/components/layout/UserPanel.tsx`**
- Replace the `NavLink` wrapping avatar+name with a `PopoverTrigger` button
- Import and wrap with `Popover` + render `UserPanelPopover` as `PopoverContent`
- The avatar/name area becomes the trigger; audio controls + settings gear remain unchanged outside the popover

### Files changed

| File | Action |
|------|--------|
| `src/components/layout/UserPanelPopover.tsx` | Create -- popover content |
| `src/components/layout/UserPanel.tsx` | Edit -- replace NavLink with Popover trigger |

