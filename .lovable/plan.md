

## Redesign UserPanelPopover to Match Discord Layout

### Changes to `src/components/layout/UserPanelPopover.tsx`

**1. Container-based layout instead of separators**
Replace `<Separator>` lines with grouped containers using `rounded-md bg-accent/30 p-1` (or similar muted background) to visually group items, matching Discord's card-within-card pattern:
- **Container 1**: "Edit Profile" button + Status row (with chevron)
- **Container 2**: "Sign Out" button

**2. Rename "Settings" to "Edit Profile"**
Change the label from `t("nav.settings", "Edit Profile")` to just `"Edit Profile"` (hardcode or use a proper i18n key like `t("profile.editProfile", "Edit Profile")`).

**3. Status submenu appears to the side (not inline)**
Instead of expanding the status options inside the popover, render them as a **side-positioned floating panel** using absolute/fixed positioning:
- When the status row is hovered or clicked, show a separate floating menu to the right (or left in RTL) of the popover
- Use `absolute` positioning relative to the popover, offset to the side with `left-full` or `right-full`
- The side menu has its own rounded container with status options (Online, Idle, DND, Invisible) each with a description like Discord shows

### Structure

```text
┌─────────────────────────┐
│  Banner                 │
│  Avatar + Status Bubble │
│  Name / @username       │
│                         │
│  ┌───────────────────┐  │
│  │ ✏ Edit Profile    │  │
│  │ ● Online        > │──┤──► ┌──────────────────┐
│  └───────────────────┘  │    │ ● Online          │
│                         │    │ 🌙 Idle            │
│  ┌───────────────────┐  │    │ ⛔ Do Not Disturb │
│  │ → Sign Out        │  │    │ ○ Invisible       │
│  └───────────────────┘  │    └──────────────────┘
└─────────────────────────┘
```

### Implementation details

- Remove all `<Separator>` usage
- Wrap "Edit Profile" + status row in a `div` with `rounded-md bg-muted/50 p-1 space-y-0.5`
- Wrap "Sign Out" in a separate `div` with same container styling
- Add `mt-2` gap between the two containers
- For the side status menu: use a `div` with `absolute left-full top-0 ml-2` (flipped for RTL with `rtl:left-auto rtl:right-full rtl:ml-0 rtl:mr-2`) positioned relative to the status button row
- The side menu container uses `rounded-md border bg-popover/95 backdrop-blur-xl p-1 shadow-lg w-[200px]`
- Show on hover of the status row OR on click, hide on mouse leave from both the row and the submenu (use a wrapper div with `onMouseEnter`/`onMouseLeave`)

### File changed
- `src/components/layout/UserPanelPopover.tsx` -- full restructure of the bottom section

