

## Architectural Insight

**Individual session revocation limitation.** Supabase's client SDK only exposes `signOut({ scope: 'others' })` (kill all OTHER sessions) and `signOut({ scope: 'global' })` (kill ALL sessions). There is no API to revoke a single specific session by token or session ID. This means the "Log out" button on an individual device card can only **delete the tracking row** from `user_devices` — it cannot actually invalidate that session's JWT. The device will appear removed from the list, but the session remains valid until the JWT expires or the user does a global sign-out. This is a known Supabase limitation and matches how most apps handle it (Discord included — individual device logout is best-effort). The "Log Out of All Other Devices" button, however, **does** truly revoke all other sessions via `scope: 'others'`.

**Hook placement.** The tracker must run globally for every authenticated page load, not just when Settings is open. The best place is inside `AppLayout` (or a component rendered by it), since all authenticated routes pass through it.

**Stale device cleanup.** Devices where `last_active` is older than ~30 days should be considered stale. We can filter these out in the UI query rather than adding a cron job.

---

## Plan

### 1. Database Migration — `user_devices` table

```sql
CREATE TABLE public.user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  os text NOT NULL DEFAULT 'Unknown',
  browser text NOT NULL DEFAULT 'Unknown',
  ip_address text,
  location text,
  last_active timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices"
  ON public.user_devices FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own devices"
  ON public.user_devices FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own devices"
  ON public.user_devices FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices"
  ON public.user_devices FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
```

### 2. Session Tracking Hook — `src/hooks/useDeviceTracker.ts`

- On mount (when `user` exists), generate or retrieve `mshb_device_id` from localStorage (crypto.randomUUID).
- Parse `navigator.userAgent` to extract OS and browser strings.
- Upsert into `user_devices` matching `(user_id, device_id)`, updating `os`, `browser`, `last_active`.
- Throttle: only upsert once per 5 minutes using a localStorage timestamp to avoid hammering the DB on every re-render.
- IP/location left `null` for now (client can't reliably self-detect IP; can add an edge function later if desired).

### 3. Integrate Hook Globally — `src/components/layout/AppLayout.tsx`

- Import and call `useDeviceTracker()` inside `AppLayout` so it runs for all authenticated routes.

### 4. UI Component — `src/components/settings/tabs/DevicesTab.tsx`

- **Header:** "Devices" + description text.
- **Current device card** (matching localStorage `mshb_device_id`): green "Current Device" badge, OS icon (`Monitor`/`Smartphone`/`Laptop`), browser name, `last_active` as relative time.
- **Other device cards:** same layout, each with a red "Log Out" button that deletes that row from `user_devices`. (Note: this removes the tracker only; the actual session remains valid until JWT expiry — acceptable trade-off.)
- **"Log Out of All Other Devices" button** at the bottom: calls `supabase.auth.signOut({ scope: 'others' })` then deletes all rows in `user_devices` where `device_id != currentDeviceId`. This truly revokes all other sessions.
- Filter out devices with `last_active` older than 30 days.

### 5. Wire into SettingsModal — `src/components/settings/SettingsModal.tsx`

- Add `"devices"` to `TabId` union.
- Add nav item `{ id: "devices", labelKey: "settings.devices", icon: Monitor }` under User Settings (after "account").
- Add lazy import for `DevicesTab` and entry in `TAB_COMPONENTS`.

### 6. i18n — `src/i18n/en.ts` and `src/i18n/ar.ts`

- Add keys: `settings.devices`, `settings.devicesDescription`, `settings.currentDevice`, `settings.logOutDevice`, `settings.logOutAllOther`, `settings.logOutAllConfirm`, `settings.deviceLoggedOut`, `settings.allDevicesLoggedOut`.

---

### Files Summary

| Action | File |
|--------|------|
| **Migration** | `user_devices` table + RLS |
| **Create** | `src/hooks/useDeviceTracker.ts` |
| **Create** | `src/components/settings/tabs/DevicesTab.tsx` |
| **Edit** | `src/components/layout/AppLayout.tsx` — add `useDeviceTracker()` |
| **Edit** | `src/components/settings/SettingsModal.tsx` — add devices tab |
| **Edit** | `src/i18n/en.ts` — add device strings |
| **Edit** | `src/i18n/ar.ts` — add device strings |

### Individual Device Logout Caveat

As noted above, the per-device "Log Out" button only removes the tracking row. True session invalidation for a single session is not supported by the auth system. The "Log Out All Other Devices" button **does** revoke sessions server-side. This will be noted with a subtle tooltip on the individual button.

