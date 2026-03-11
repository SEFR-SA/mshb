

## Mshb Pro Subscription Management + Boost Cancel Fix

This is a multi-layered fix spanning database schema, edge functions, and 3 UI components.

---

### Problem Summary

1. **Cancel auto-renew instantly removes boost** — The `cancel-streampay-subscription` edge function sets `status = 'canceled'`, which triggers `handle_boost_change` → `recalculate_server_boost`, immediately decrementing the server's boost count.
2. **No boost management UI** — No gear icon, no transfer, no toggle auto-renew.
3. **No Pro subscription cancellation** — Users cannot cancel their Mshb Pro subscription.
4. **BillingTab has hardcoded mock data** and a payment methods section that is no longer needed.

---

### Step 1: Database Migration

Add columns to `user_boosts` and `user_subscriptions`:

```sql
ALTER TABLE user_boosts ADD COLUMN auto_renew boolean NOT NULL DEFAULT true;
ALTER TABLE user_boosts ADD COLUMN expires_at timestamptz;

ALTER TABLE user_subscriptions ADD COLUMN auto_renew boolean NOT NULL DEFAULT true;
```

Create a new RPC `transfer_boost(p_boost_id uuid, p_new_server_id uuid)`:
- Verifies `auth.uid()` owns the boost and it is active
- Verifies user is a member of the new server
- Updates `server_id` to the new server (triggers will handle old/new server recalculation)

Update `recalculate_server_boost` / `handle_boost_change` trigger logic:
- Only count boosts where `status = 'active'` AND (`expires_at IS NULL` OR `expires_at > now()`)
- This ensures expired boosts (canceled auto-renew that ran out) are excluded

---

### Step 2: Update `cancel-streampay-subscription` Edge Function

**Current behavior:** Sets `status = 'canceled'` → triggers immediate boost removal.

**New behavior:**
- Instead of `status = 'canceled'`, set `auto_renew = false` and keep `status = 'active'`
- Set `expires_at` to the end of the current billing period (30 days from `started_at` if not already set)
- The boost remains active on the server until `expires_at` passes
- Rename the function conceptually to handle "cancel auto-renew" (keep the same endpoint for backward compatibility)

---

### Step 3: New Edge Function `cancel-pro-subscription`

- Authenticated endpoint
- Finds the user's active `user_subscriptions` row
- Sets `auto_renew = false`, `status = 'canceling'`
- Sets `expires_at` on the subscription (30 days from `started_at`)
- Also sets `expires_at` on the 2 linked inventory/assigned boosts (same `streampay_transaction_id`) to the same date
- Register in `config.toml` with `verify_jwt = false`

---

### Step 4: Update `BoostsTab.tsx` — Manage Gear Icon

For each active assigned boost:
- Replace the "Cancel auto-renew" text button with a **gear icon** (`Settings2` from lucide)
- Clicking opens a `DropdownMenu` with two options:
  - **Transfer Boost** — Opens a modal listing user's servers (fetched from `server_members`), select one, calls `transfer_boost` RPC
  - **Cancel Auto-Renew** / **Resume Auto-Renew** — Toggles `auto_renew` via the edge function. If `auto_renew` is already false, show "Resume Auto-Renew" instead
- Display `expires_at` date on boosts where `auto_renew = false` (e.g., "Expires Mar 30, 2026")
- Fetch the new `auto_renew` and `expires_at` fields in the query

---

### Step 5: Rewrite `BillingTab.tsx`

Remove:
- Hardcoded `MOCK_TRANSACTIONS`
- Payment methods section (add card dialog, logos)

Add:
- **Subscription Status Card** — Fetch from `user_subscriptions`. Show tier, status, renewal date (`expires_at` or "Renews on [started_at + 30d]"), auto-renew status
- **Cancel Subscription Button** — Calls `cancel-pro-subscription` edge function. Shows confirmation dialog first. Updates UI to show "Canceling — active until [date]"
- **Transaction History from DB** — Query `user_boosts` and `user_subscriptions` with `streampay_transaction_id IS NOT NULL` to build real transaction list. Display date, description (boost vs pro), and transaction ID. Keep the expandable row pattern for VAT breakdown.

---

### Files Modified

1. **Migration SQL** — `auto_renew`, `expires_at` columns + `transfer_boost` RPC + updated trigger logic
2. **`supabase/functions/cancel-streampay-subscription/index.ts`** — Set `auto_renew = false` instead of `status = 'canceled'`
3. **`supabase/functions/cancel-pro-subscription/index.ts`** — New edge function
4. **`supabase/config.toml`** — Register `cancel-pro-subscription`
5. **`src/components/settings/tabs/BoostsTab.tsx`** — Gear icon, dropdown, transfer modal, auto-renew toggle
6. **`src/components/settings/tabs/BillingTab.tsx`** — Real subscription status, cancel button, real transaction history

### No Breaking Changes
- Existing boosts with `auto_renew = true` (default) and `expires_at = NULL` behave identically to before
- The trigger only adds an extra condition; existing active boosts without expiry continue to count

