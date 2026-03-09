

## Plan: Deploy Edge Functions + Fix Build Error

### Build Error Fix

**File:** `src/components/server/ServerChannelChat.tsx` (line 750)

`MAX_FILE_SIZE` is referenced in `handleDrop` but never defined. The same file already computes the correct value on line 914 using `getBoostPerks(serverBoostLevel).maxUploadSizeMB * 1024 * 1024`.

**Fix:** Replace `MAX_FILE_SIZE` on line 750 with `getBoostPerks(serverBoostLevel).maxUploadSizeMB * 1024 * 1024`, matching the pattern already used in `ChatInputActions`. Also remove the unused `DEFAULT_MAX_FILE_SIZE` constant on line 45.

### Edge Function Deployments

1. **`streampay-webhook`** — Redeploy. The file already contains the updated code with boost announcement message insertion (lines 212-245). Already configured in `config.toml` with `verify_jwt = false`.

2. **`cancel-streampay-subscription`** — First-time deploy. Code is already in the repo. Need to add its config entry to `supabase/config.toml`:
   ```toml
   [functions.cancel-streampay-subscription]
   verify_jwt = false
   ```

3. **`create-streampay-checkout`** — Test invocation using the edge function testing tool to verify it returns the expected error (since we likely don't have a real StreamPay key configured, we expect a 502 or "Payment gateway not configured" response).

### Steps
1. Fix `MAX_FILE_SIZE` build error in `ServerChannelChat.tsx`
2. Add `cancel-streampay-subscription` to `config.toml`
3. Deploy `streampay-webhook` (redeploy)
4. Deploy `cancel-streampay-subscription` (first deploy)
5. Test `create-streampay-checkout` with a curl/invoke call

