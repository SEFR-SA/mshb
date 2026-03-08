

## Fix UserPanel Popover Overlap & Alignment

### Problems
1. **Overlap**: The popover opens with `side="top"` but uses default `sideOffset={4}` (from popover.tsx), so it sits nearly on top of the UserPanel trigger.
2. **Alignment**: `align="start"` anchors to the trigger button's start edge (the avatar area), but the trigger is only the left portion of the panel -- causing the 300px popover to lean right relative to the full UserPanel width.

### Fix in `src/components/layout/UserPanel.tsx` (line 105)

Change the `PopoverContent` props:
- `sideOffset={8}` -- adds 8px gap between panel and popover to prevent overlap
- `align="center"` -- centers the popover relative to the trigger

```tsx
<PopoverContent side="top" align="center" sideOffset={8} className="p-0 w-auto">
```

This is a one-line prop change that fixes both issues.

