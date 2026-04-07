

## Add Event Frequency to Server Events

### Phase 1: Database Migration

Add a `frequency` text column to `server_events`, defaulting to `'DOES_NOT_REPEAT'`:

```sql
ALTER TABLE public.server_events
  ADD COLUMN frequency text NOT NULL DEFAULT 'DOES_NOT_REPEAT';
```

No new RLS policies needed — existing policies cover all columns on the table.

### Phase 2: Update CreateEventModal

**FormState** — add `frequency: string` field, default `'DOES_NOT_REPEAT'`:

```typescript
interface FormState {
  // ... existing fields
  frequency: string;
}
```

**Step 2 UI** — after the End Date/Time picker, add a `<Select>` dropdown with label "Event Frequency" and these options:
- Does not repeat (`DOES_NOT_REPEAT`)
- Daily (`DAILY`)
- Weekly on {day} (`WEEKLY`)
- Monthly (`MONTHLY`)
- Annually (`YEARLY`)
- Every weekday (Monday to Friday) (`WEEKDAYS`)

The "Weekly" and similar labels will be dynamically generated from the selected start date (e.g., "Weekly on Tuesday") to match Discord's behavior shown in the screenshot.

**handleSubmit** — include `frequency: form.frequency` in the insert payload (cast as `any` to bypass type checking until types regenerate).

### Files

| File | Action |
|------|--------|
| New migration | Add `frequency` column |
| `src/components/server/events/CreateEventModal.tsx` | Add field to FormState, Select dropdown in step 2, include in insert |

