

## DM Notification Cleanup

### Phase 1: Database Migration

```sql
DROP TRIGGER IF EXISTS trg_notify_on_dm_message ON public.messages;
DROP FUNCTION IF EXISTS public.notify_on_dm_message();
```

Plus a data cleanup (via insert tool):
```sql
DELETE FROM public.notifications WHERE type = 'dm_message';
```

### Phase 2: Frontend Cleanup

- **`NotificationCenter.tsx`** — Remove the `case "dm_message"` line from `getNotificationText`
- **`src/i18n/en.ts`** — Remove `dmMessage` key
- **`src/i18n/ar.ts`** — Remove `dmMessage` key

Ready to execute on your approval.

