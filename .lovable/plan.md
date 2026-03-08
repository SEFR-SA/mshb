

## Reduce UserPanelPopover Avatar Size

The current avatar in the UserPanelPopover is 80px (`h-20 w-20`, `size={80}`), which is too large for a popover card. Discord uses roughly 56px for this context.

### Changes to `src/components/layout/UserPanelPopover.tsx`

- Change `AvatarDecorationWrapper` `size` from `80` to `56`
- Change `Avatar` className from `h-20 w-20` to `h-14 w-14`
- Change banner overlap from `-mt-10` to `-mt-7` (to match smaller avatar overflow)
- Change `AvatarFallback` text size from `text-lg` to `text-base`

### Update SSOT memory

The standardized avatar sizes become:
| Context | Size |
|---------|------|
| Full profile modal / sidebar panel | 120px |
| UserPanelPopover (card popup) | 56px |
| UserPanel row (bottom bar) | 32px |

