

## Fix Status Submenu Positioning and Spacing

### Changes to `src/components/layout/UserPanelPopover.tsx`

**1. Move submenu higher** — Change `-mt-2` to `-mt-6` on the inner submenu container (line 146) so the last option ("Invisible") is fully visible.

**2. Add spacing between hover items** — Add `space-y-0.5` to the submenu container (line 146) so the rounded hover backgrounds have a small gap between them instead of touching.

