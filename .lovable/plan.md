

## Fix: Revoke Mshb Pro on Refund

### Root Cause
In `streampay-webhook/index.ts` lines 258-282, the `PAYMENT_REFUNDED` / `PAYMENT_FAILED` handler updates `user_boosts` but completely ignores `user_subscriptions`. A refunded Pro payment correctly cancels the boosts, but the subscription record stays `active`, so `sync_pro_status` trigger never fires and the user keeps Pro.

### Fix (single file change)

**`supabase/functions/streampay-webhook/index.ts`** — After updating `user_boosts`, also update `user_subscriptions` for the same `transactionId`:

```typescript
// After the existing user_boosts update (line 272), add:
const subStatus = eventType === "PAYMENT_REFUNDED" ? "refunded" : "past_due";
const { error: subUpdateError } = await supabase
  .from("user_subscriptions")
  .update({
    status: subStatus,
    expires_at: new Date().toISOString(),
  })
  .eq("streampay_transaction_id", transactionId);

if (subUpdateError) {
  console.error(`Failed to update subscription for tx=${transactionId}:`, subUpdateError);
}
```

This sets `status = 'refunded'` and `expires_at = now()`, which triggers `sync_pro_status` (already in the DB) to set `profiles.is_pro = false` immediately.

### Why this is sufficient
- The `sync_pro_status` trigger already checks `status IN ('active', 'canceling') AND (expires_at IS NULL OR expires_at > now())`. Setting status to `'refunded'` with `expires_at = now()` fails both conditions, so `is_pro` flips to `false`.
- The existing `user_boosts` update on the same transaction handles revoking the 2 inventory boosts.
- No database migration needed — all columns already exist.

### Files Modified
1. `supabase/functions/streampay-webhook/index.ts` — Add `user_subscriptions` update in the refund/failure handler

