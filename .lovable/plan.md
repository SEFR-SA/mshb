

## Mshb Pro Subscription + Boost Inventory System

This is a large multi-step feature spanning database, edge functions, and UI. Here is the implementation plan.

---

### Pre-requisite: Add Secret

We need to add a `STREAMPAY_PRO_PRODUCT_ID` secret via the secrets tool so the edge function knows which StreamPay product corresponds to the Pro subscription.

---

### Step 1: Database Migration

**New table: `user_subscriptions`**
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `tier` (text, default `'pro'`)
- `status` (text, default `'active'`)
- `started_at` (timestamptz, default `now()`)
- `expires_at` (timestamptz, nullable)
- `streampay_transaction_id` (text, nullable)
- RLS: Users can SELECT own rows only. No client INSERT/UPDATE/DELETE (webhook handles it).
- Enable realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;`

**New RPC: `apply_inventory_boost(p_server_id uuid)`**
- Finds ONE `user_boosts` row where `user_id = auth.uid()` AND `server_id IS NULL` AND `status = 'active'`
- Updates it to set `server_id = p_server_id`
- Returns boolean success
- Uses `SECURITY DEFINER` so it bypasses RLS (user_boosts has no UPDATE policy)
- Validates the user is a member of the target server

**Profile update trigger**: When a row is inserted into `user_subscriptions` with `status = 'active'`, set `profiles.is_pro = true` for that user. When status changes away from `'active'`, check if they still have any active subscription before setting `is_pro = false`.

---

### Step 2: Update `streampay-webhook` Edge Function

Add a branch in the `PAYMENT_SUCCEEDED` handler:

- Check `customMetadata.type` (we'll pass `type: 'pro'` or `type: 'boost'` from checkout)
- **If `type === 'pro'`:**
  1. Upsert into `user_subscriptions` (user_id, tier='pro', status='active', streampay_transaction_id)
  2. Insert 2 rows into `user_boosts` with `server_id = NULL`, `status = 'active'` (inventory boosts)
  3. Set `profiles.is_pro = true`
- **If `type === 'boost'` (or no type — backward compat):** Keep existing logic

---

### Step 3: New Edge Function `create-pro-checkout`

Similar to `create-streampay-checkout` but for the Pro subscription:
- Authenticated endpoint
- Uses `STREAMPAY_PRO_PRODUCT_ID` instead of boost product
- Passes `custom_metadata: { userId, type: 'pro' }` (no `serverId`)
- Returns `payment_url`
- Config: `verify_jwt = false` in config.toml

---

### Step 4: Update `SubscriptionsTab.tsx`

Transform the placeholder "Subscribe" button into a real checkout flow:
- Fetch `user_subscriptions` to check if user already has active Pro
- If active: show "You're a Pro member!" with status and expiry
- If not: "Subscribe to Mshb Pro" button triggers the checkout flow
- **Electron-safe patterns:**
  - `window.open(url, '_blank')` for checkout
  - `setInterval` polling for `paymentWindow.closed`
  - Supabase Realtime subscription on `user_subscriptions` for instant UI update
  - "Awaiting Payment..." state with helper text

---

### Step 5: Update `ServerBoostPage.tsx` — Inventory Check

Before opening StreamPay:
1. Query `user_boosts` where `user_id = user.id` AND `server_id IS NULL` AND `status = 'active'` → count as `availableBoosts`
2. **If `availableBoosts > 0`:** Show an AlertDialog: "You have {n} available boosts from Mshb Pro! Use one to boost this server?"
   - "Confirm" calls `supabase.rpc('apply_inventory_boost', { p_server_id: serverId })`
   - On success: toast, refetch data
3. **If `availableBoosts === 0`:** Current StreamPay flow unchanged

Also display inventory stats (Available / Spent / Total) in a small summary card above the boost button.

---

### Step 6: Update `BoostsTab.tsx` — Show Inventory

Add an inventory summary section at the top:
- **Total:** All `user_boosts` count
- **Spent:** Where `server_id IS NOT NULL`
- **Available:** Where `server_id IS NULL` AND `status = 'active'`

Show unassigned boosts in the list with a "Use Boost" button that navigates to server selection or opens a server picker.

---

### Files Modified
1. **Migration SQL** — `user_subscriptions` table + `apply_inventory_boost` RPC + subscription trigger
2. **`supabase/functions/streampay-webhook/index.ts`** — Pro subscription handling branch
3. **`supabase/functions/create-pro-checkout/index.ts`** — New edge function
4. **`supabase/config.toml`** — Add `create-pro-checkout` entry
5. **`src/components/settings/tabs/SubscriptionsTab.tsx`** — Real checkout + realtime
6. **`src/pages/ServerBoostPage.tsx`** — Inventory check + AlertDialog
7. **`src/components/settings/tabs/BoostsTab.tsx`** — Inventory summary display

### No Breaking Changes
- Existing boost flow remains intact for `type === 'boost'` or missing type metadata (backward compatible)
- `is_pro` flag already used throughout the app for gating

