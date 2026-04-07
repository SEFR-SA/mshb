

## DateTimePicker Component — Implementation Plan

### Problem
The event creation modal uses native `<input type="date">` and `<input type="time">` which render with browser-default styling, breaking the dark theme.

### Solution
Create a reusable `DateTimePicker` component using existing `Calendar`, `Popover`, and `ScrollArea` primitives. Replace the 4 native inputs (start date/time, end date/time) in `CreateEventModal.tsx` with 2 instances of this component.

### Component API

```tsx
<DateTimePicker
  value={Date | undefined}
  onChange={(date: Date | undefined) => void}
  placeholder="Select date & time"
/>
```

### Internal State Management

The component does NOT own the `Date` — it receives it via `value` and calls `onChange`.

Internally:
- **Calendar** receives `value` as `selected` date. On day click, it merges the selected day with the existing time (hours/minutes from `value`, or defaults to 12:00 PM if no time yet) and calls `onChange` with the merged `Date`.
- **Time list** is a `ScrollArea` of 30-minute slots (48 items: 12:00 AM through 11:30 PM). On slot click, it takes the current date from `value` (or today if no date yet), sets hours/minutes from the clicked slot, and calls `onChange`. The active slot is highlighted with `bg-primary text-primary-foreground`.
- Both sections always produce a complete `Date` object on every interaction — no partial state.

### Popover Layout

```text
┌─────────────────────────────────────────┐
│  ┌──────────────────────┐ ┌───────────┐ │
│  │     Calendar         │ │  ScrollArea│ │
│  │   (existing comp)    │ │  12:00 AM │ │
│  │                      │ │  12:30 AM │ │
│  │                      │ │  1:00 AM  │ │
│  │                      │ │  ...      │ │
│  │                      │ │  11:30 PM │ │
│  └──────────────────────┘ └───────────┘ │
└─────────────────────────────────────────┘
```

Calendar on the left, time scroll on the right, side by side.

### FormState Change in CreateEventModal

Replace the 4 string fields (`startDate`, `startTime`, `endDate`, `endTime`) with 2 `Date | undefined` fields:

```typescript
interface FormState {
  // ... existing fields unchanged
  startDateTime: Date | undefined;  // replaces startDate + startTime
  endDateTime: Date | undefined;    // replaces endDate + endTime
}
```

Update `canProceedStep2` to check `!!form.startDateTime`. Update `handleSubmit` to call `.toISOString()` directly on `startDateTime` / `endDateTime`. Update step 3 preview to format from these Date objects.

### Files

| File | Action |
|------|--------|
| `src/components/ui/date-time-picker.tsx` | Create |
| `src/components/server/events/CreateEventModal.tsx` | Edit — swap inputs for `<DateTimePicker />`, update FormState |

### Constraints respected
- No DB changes
- No other files touched
- Uses existing `Calendar`, `Popover`, `ScrollArea`, `Button` components
- Standard Tailwind theme classes only

