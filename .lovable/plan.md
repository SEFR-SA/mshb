

## Root Cause

Two issues are preventing boosts from working:

### Issue 1: `custom_metadata` extraction path is wrong

The edge function logs prove this clearly:

```
Body keys: ["data", "status", "entity_id", "timestamp", "entity_url", "event_type", "entity_type"]
userId: undefined, serverId: undefined
```

The code reads `body.custom_metadata` (top-level), but StreamPay nests it inside `body.data`. The fix is to look for metadata in `body.data.custom_metadata` (and fall back to `body.data.metadata` in case StreamPay uses either key).

Line 107 currently:
```typescript
const customMetadata = body.custom_metadata as Record<string, string> | undefined;
```
Should be:
```typescript
const data = body.data as Record<string, unknown> | undefined;
const customMetadata = (data?.custom_metadata ?? data?.metadata) as Record<string, string> | undefined;
```

Additionally, add a `console.log("Body.data keys:", Object.keys(data ?? {}))` to confirm the structure on the next webhook.

### Issue 2: Database trigger is still missing

The context shows `<db-triggers>There are no triggers in the database.</db-triggers>`. The previous migration to create `on_user_boost_change` either failed or wasn't applied. Without this trigger, even if the insert succeeds, `servers.boost_count`/`boost_level` and `server_members.is_booster` are never updated.

Need to create a new migration:
```sql
DROP TRIGGER IF EXISTS on_user_boost_change ON public.user_boosts;
CREATE TRIGGER on_user_boost_change
  AFTER INSERT OR UPDATE OR DELETE ON public.user_boosts
  FOR EACH ROW EXECUTE FUNCTION public.handle_boost_change();
```

### Files to modify
- `supabase/functions/streampay-webhook/index.ts` — fix `custom_metadata` extraction path (line 107-109)
- Database migration — re-create the missing trigger

