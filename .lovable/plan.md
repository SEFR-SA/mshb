

## Make FreeStuff Bot Opt-In

### What we're building
A toggle that lets server owners enable/disable the FreeStuff bot. Disabled by default. When disabled: bot doesn't post, bot doesn't appear in the member list, and bot's `server_members` row is removed.

### Step 1: Database Migration

Add `free_games_bot_enabled` boolean column (default `false`) to `servers`:

```sql
ALTER TABLE public.servers ADD COLUMN IF NOT EXISTS free_games_bot_enabled boolean NOT NULL DEFAULT false;
```

### Step 2: Update EngagementTab.tsx

In the "FREE GAMES BOT" section (line 412):
- Add state `freeGamesBotEnabled` (loaded from `free_games_bot_enabled` in the existing query at line 82)
- Add a `<Switch>` toggle labeled "Enable Mshb FreeStuff Bot" above the channel selector
- When toggled ON: update `free_games_bot_enabled = true` and upsert bot into `server_members` (user_id = `00000000-0000-0000-0000-000000000001`, role = `bot`)
- When toggled OFF: update `free_games_bot_enabled = false`, clear `free_games_channel_id = null`, and delete the bot's `server_members` row
- Hide the channel selector when the toggle is OFF
- Add the new column to the load query (line 82)

### Step 3: Update ServerMemberList.tsx

The bot appears because it has a `server_members` row with `role = "bot"`. Since Step 2 removes that row when disabled, no changes needed here — the bot simply won't appear in the member query results.

However, as a safety net: fetch `free_games_bot_enabled` from the server, and filter out bot members with `user_id === BOT_USER_ID` when the flag is false.

### Step 4: Update Edge Function

In `free-games-bot/index.ts` (line 102-105), add `.eq("free_games_bot_enabled", true)` to the server query:

```typescript
const { data: servers } = await service
  .from("servers")
  .select("id, free_games_channel_id")
  .not("free_games_channel_id", "is", null)
  .eq("free_games_bot_enabled", true);
```

Then redeploy the edge function.

### Files to modify
- New migration — add `free_games_bot_enabled` column
- `src/components/server/settings/EngagementTab.tsx` — toggle UI + bot member management
- `src/components/server/ServerMemberList.tsx` — safety filter for bot visibility
- `supabase/functions/free-games-bot/index.ts` — add filter condition
