

# Phase 3: Community-Exclusive Channel Type Restrictions

## Current State
- Server data is fetched with `select("*")` in `ChannelSidebar.tsx`, so `is_community` is already in the response — but the `Server` interface doesn't declare it.
- Channel creation dialog shows Announcement/Rules toggles (switches) for text channels and a "Support" option in the type dropdown — all unconditionally visible.
- Channel creation goes directly via `supabase.from("channels").insert(...)` — no backend gate on community-exclusive types.
- The `channels` INSERT RLS policy only checks `is_server_admin()`, no community check.

## Plan

### 1. Database Migration — Backend Security Gate

Create a validation trigger on `channels` INSERT that rejects community-exclusive types for non-community servers:

```sql
CREATE OR REPLACE FUNCTION public.validate_community_channel()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.type = 'support' OR NEW.is_announcement = true OR NEW.is_rules = true THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.servers WHERE id = NEW.server_id AND is_community = true
    ) THEN
      RAISE EXCEPTION 'Community features require a Community Server';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_community_channel
BEFORE INSERT ON public.channels
FOR EACH ROW EXECUTE FUNCTION public.validate_community_channel();
```

This prevents any bypass via direct API calls.

### 2. Frontend — `ChannelSidebar.tsx`

**Add `is_community` to `Server` interface** (line ~53):
```typescript
is_community?: boolean;
```

**Lock channel type options** in the create channel dialog:
- In the type `<Select>`, disable "Support" option when `!server?.is_community`. Show a lock icon and tooltip.
- For the Announcement and Rules switches (shown when type is "text"), disable them when `!server?.is_community`. Show lock icon + helper text.
- When locked options are interacted with, show a muted hint: "Enable Community Server in Server Settings to unlock."

### 3. Translations

Add keys to `en.ts` and `ar.ts`:
- `channels.communityOnly`: "Enable Community Server in Settings to unlock this feature."

## Files Modified/Created
1. **Migration SQL** — validation trigger on `channels` INSERT
2. `src/components/server/ChannelSidebar.tsx` — `Server` interface + locked UI for non-community servers
3. `src/i18n/en.ts` + `src/i18n/ar.ts` — one new translation key

