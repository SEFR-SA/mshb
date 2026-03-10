

## Root Cause Analysis

From the webhook logs, StreamPay's actual webhook format is completely different from what our code expects. Here's what StreamPay actually sends:

**Actual StreamPay headers:**
- `x-webhook-event: PAYMENT_SUCCEEDED` (not in body as `event.type`)
- `x-webhook-signature: t=1773106882,v1=4cedf355...` (not `X-StreamPay-Signature` with raw HMAC)
- `x-webhook-entity-type: PAYMENT`
- `x-webhook-entity-id: b3e78a7a-...`
- `x-webhook-timestamp: 1773106882`
- User-Agent: `StreamApp-Webhook/1.0`
- No `x-api-key` header sent by StreamPay on webhooks

**Three critical mismatches:**

1. **Authentication fails** — Our code looks for `X-StreamPay-Signature` (raw hex HMAC) or `x-api-key`. StreamPay sends `x-webhook-signature` with format `t=<timestamp>,v1=<hash>` (Stripe-style signed payload). Neither auth path matches, so every webhook gets 403'd.

2. **Event type routing fails** — Our code reads `event.type` from the JSON body expecting `"payment.paid"`. StreamPay puts the event type in the `x-webhook-event` header as `"PAYMENT_SUCCEEDED"`.

3. **Payload structure mismatch** — Our code expects `event.data.id` and `event.data.metadata.userId/serverId`. The actual body structure likely differs (entity ID is in `x-webhook-entity-id` header, and metadata may be under `custom_metadata`).

## Plan

### 1. Fix webhook signature verification

Rewrite `isRequestAuthentic` to handle StreamPay's actual signature format:
- Read `x-webhook-signature` header (not `X-StreamPay-Signature`)
- Parse the `t=<timestamp>,v1=<hash>` format
- Compute HMAC-SHA256 over `<timestamp>.<rawBody>` using `STREAMPAY_SECRET_KEY`
- Compare the computed hash against `v1`
- Optional: reject if timestamp is too old (replay protection)

### 2. Fix event type routing

- Read `x-webhook-event` header instead of `event.type` from body
- Map `PAYMENT_SUCCEEDED` → insert boost (was `payment.paid`)
- Map `PAYMENT_FAILED` → mark past_due
- Map `PAYMENT_REFUNDED` → mark canceled

### 3. Fix payload data extraction

- Use `x-webhook-entity-id` header as the transaction/payment ID
- Parse body for `custom_metadata.userId` and `custom_metadata.serverId` (the fields we passed when creating the payment link)
- Add detailed logging of the parsed body on first successful webhook to confirm structure

### 4. Verify database triggers exist

The logs show `<db-triggers>There are no triggers in the database.</db-triggers>` — this is suspicious. The `handle_boost_change` and `trigger_user_boost_change` functions exist but may not be attached as triggers. We need to verify and create the trigger if missing:
```sql
CREATE TRIGGER on_user_boost_change
  AFTER INSERT OR UPDATE OR DELETE ON user_boosts
  FOR EACH ROW EXECUTE FUNCTION handle_boost_change();
```

Without this trigger, even if the webhook successfully inserts into `user_boosts`, the `servers.boost_count`/`boost_level` and `server_members.is_booster` fields will never update.

### Files to modify
- `supabase/functions/streampay-webhook/index.ts` — complete rewrite of auth + event handling
- Database migration — create missing trigger on `user_boosts` table

