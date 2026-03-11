

# Fix: `enable_community` RPC Blocked by Own Trigger

## Root Cause

The `enable_community` function creates channels with `is_rules=true` / `is_announcement=true` **before** setting `is_community=true` on the server. The `validate_community_channel` trigger fires on channel INSERT, sees `is_community=false`, and rejects the operation.

## Fix

Single migration to replace the `enable_community` function, reordering operations:

1. Set `is_community = true` on the server **first**
2. Then create the rules/announcements channels
3. Then update the channel ID references

This way the trigger check passes because the server is already flagged as community when the channels are inserted.

```sql
-- Reordered: set is_community FIRST, then create channels
UPDATE public.servers SET is_community = true WHERE id = p_server_id;

-- Now channel inserts pass the trigger
IF v_rules_id IS NULL THEN
  INSERT INTO public.channels (...) VALUES (...) RETURNING id INTO v_rules_id;
END IF;

IF v_updates_id IS NULL THEN
  INSERT INTO public.channels (...) VALUES (...) RETURNING id INTO v_updates_id;
END IF;

-- Set channel references
UPDATE public.servers
SET rules_channel_id = v_rules_id, public_updates_channel_id = v_updates_id
WHERE id = p_server_id;
```

## Files

1. **Migration SQL** — `CREATE OR REPLACE FUNCTION enable_community` with reordered operations

No frontend changes needed.

