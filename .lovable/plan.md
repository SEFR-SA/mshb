

## Investigation

The bug has two causes:

1. **Individual device "X" button** — `removeDevice()` only deletes the DB row. It never calls any auth revocation API. The other device's session JWT remains valid.

2. **"Log Out All Other Devices"** — `signOut({ scope: 'others' })` does revoke refresh tokens server-side, but the other client only discovers this when its JWT expires and it tries to refresh (up to 1 hour later). There is no push mechanism to immediately kick the other client.

**Root cause:** The remote client has no way to know its session was revoked until the JWT naturally expires.

## Fix Plan

Add a realtime listener in `useDeviceTracker` that watches for the current device's row being deleted from `user_devices`. When detected, force a local sign-out immediately.

### Changes

| File | What |
|------|------|
| `src/hooks/useDeviceTracker.ts` | Subscribe to `postgres_changes` DELETE events on `user_devices` filtered to the current user. If the deleted row's `device_id` matches the local device ID, call `supabase.auth.signOut()` to force logout. |

### Migration

Enable realtime on the `user_devices` table:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_devices;
```

### Logic

```text
useDeviceTracker:
  existing: upsert device on mount (throttled)
  new: subscribe to DELETE on user_devices where user_id = current user
       → if payload.old.device_id === local device_id → supabase.auth.signOut()
```

This makes both the individual "X" button and "Log Out All Others" immediately kick the remote device, because both paths delete the `user_devices` row.

