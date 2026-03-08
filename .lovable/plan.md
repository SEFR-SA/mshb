

## Add Shadow to StatusBubble & Add StatusBubble to UserPanelPopover

### 1. `src/components/shared/StatusBubble.tsx` (line 46)
- Change `shadow-sm` to `shadow-md` on the bubble span for a more visible shadow

### 2. `src/components/layout/UserPanelPopover.tsx`
- Import `StatusBubble` 
- Add it after the avatar section (after `AvatarDecorationWrapper` closes, around line 98), displaying `profile.status_text`
- Position it next to the avatar, matching how it's used in ProfileTab/FullProfileModal

### Files changed
| File | Change |
|------|--------|
| `src/components/shared/StatusBubble.tsx` | Upgrade shadow from `shadow-sm` to `shadow-md` |
| `src/components/layout/UserPanelPopover.tsx` | Import and render `StatusBubble` with `profile.status_text` next to the avatar |

