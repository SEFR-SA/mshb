

## Plan: Add IP + Location Detection to Device Tracker

### Approach

Create a backend function (`resolve-device-location`) that:
1. Reads the client's IP from the `x-forwarded-for` header (available in edge functions)
2. Calls a free geo-IP API (`ip-api.com` — no key needed, 45 req/min free) to resolve city/country
3. Returns `{ ip, city, country }` to the client

The device tracker hook calls this function on upsert, then stores `ip_address` and `location` (as `"City, Country"`) in the `user_devices` row. The `DevicesTab` UI displays the location beneath the browser/time line.

### Changes

| Action | File | What |
|--------|------|------|
| **Create** | `supabase/functions/resolve-device-location/index.ts` | Edge function: extracts client IP from headers, calls `ip-api.com/json/{ip}`, returns `{ ip, city, country }` |
| **Edit** | `supabase/config.toml` | Add `[functions.resolve-device-location]` with `verify_jwt = false` |
| **Edit** | `src/hooks/useDeviceTracker.ts` | After parsing OS/browser, invoke `resolve-device-location` edge function, include `ip_address` and `location` in the upsert payload |
| **Edit** | `src/components/settings/tabs/DevicesTab.tsx` | Add `ip_address` and `location` to the `Device` interface; render location (e.g. "Riyadh, Saudi Arabia") below the browser line in DeviceCard |
| **Edit** | `src/i18n/en.ts` | Add `settings.unknownLocation` key |
| **Edit** | `src/i18n/ar.ts` | Add `settings.unknownLocation` key |

### Edge Function Detail

```typescript
// resolve-device-location/index.ts
// 1. Extract IP from x-forwarded-for header
// 2. GET http://ip-api.com/json/{ip}?fields=city,country,status
// 3. Return { ip, city, country } or { ip, city: null, country: null } on failure
```

No API key required. The function is only called once per 5-minute throttle window (same as existing upsert throttle), so rate limits are not a concern.

### UI Change

In `DeviceCard`, add a third line showing location when available:
```
Windows                    [Current Device]
Chrome · 2 minutes ago
📍 Riyadh, Saudi Arabia
```

