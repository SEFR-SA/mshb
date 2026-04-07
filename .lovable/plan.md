

## Chronological Validation for Event Date/Time Pickers

### Approach

Two files need changes: the `DateTimePicker` component (to accept constraint props) and the `CreateEventModal` (to wire constraints and auto-correct).

### Step 1: Extend `DateTimePicker` API

Add two optional props to `DateTimePickerProps`:

```typescript
minDate?: Date;        // calendar days before this are disabled
minTime?: Date;        // time slots before this are disabled (when same day)
```

**Calendar**: Pass `disabled={{ before: startOfDay(minDate) }}` to the `Calendar` component.

**Time list**: For each slot, if `minTime` is set and the currently selected date is the same day as `minTime`, disable slots where `(hours, minutes) <= minTime`'s time. Disabled slots get `opacity-50 pointer-events-none`.

### Step 2: Wire constraints in `CreateEventModal`

Pass `minDate={form.startDateTime}` and `minTime={form.startDateTime}` to the **End DateTime** picker only. The Start picker remains unconstrained.

### Step 3: Auto-correction `useEffect`

In `CreateEventModal`, add a `useEffect` watching `form.startDateTime`:
- If `startDateTime` exists and `endDateTime` exists and `endDateTime <= startDateTime`, push `endDateTime` forward to match `startDateTime` (same datetime).

### Files

| File | Change |
|------|--------|
| `src/components/ui/date-time-picker.tsx` | Add `minDate`/`minTime` props, disable calendar days and time slots |
| `src/components/server/events/CreateEventModal.tsx` | Pass constraint props to end picker, add auto-correction useEffect |

