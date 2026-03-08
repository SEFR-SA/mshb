

## Set Session Expiration (JWT 7 days + Refresh Rotation)

### What This Does
Configures authentication so that:
- **JWT tokens expire after 7 days** (604800 seconds) instead of the default 1 hour
- **Refresh token rotation is enabled** — each time a token is refreshed, the old refresh token is invalidated, preventing token reuse attacks

### How to Implement

This is a **backend auth configuration change only** — no code changes needed. I will use the auth configuration tool to set:

1. **`jwt_expiry`** → `604800` (7 days in seconds)
2. **`refresh_token_rotation_enabled`** → `true`
3. **`refresh_token_reuse_interval`** → `10` (10-second grace period to handle concurrent requests using the same refresh token)

### Important Notes
- The existing Supabase client in `src/integrations/supabase/client.ts` already has `autoRefreshToken: true` and `persistSession: true`, so token refresh will work automatically
- A 7-day JWT is longer than typical (usually 1 hour). This means revocation takes up to 7 days to take effect. If you want faster revocation with long sessions, a shorter JWT (e.g., 1 hour) with refresh rotation is more secure. Let me know if you'd prefer that instead.

