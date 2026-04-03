

## Two Issues to Fix

### Issue 1: Build Error — `livekit-server-sdk` npm import in Edge Function

The `livekit-token` edge function uses `import { AccessToken } from "npm:livekit-server-sdk@2.9.1"` which fails because there is no `deno.json` with `nodeModulesDir` configured. The fix is to switch to an ESM CDN import (esm.sh), matching the pattern used for `@supabase/supabase-js` on line 1 of the same file.

**File: `supabase/functions/livekit-token/index.ts`**
- Change line 2 from `import { AccessToken } from "npm:livekit-server-sdk@2.9.1"` to `import { AccessToken } from "https://esm.sh/livekit-server-sdk@2.9.1"`

### Issue 2: Channel Drag-and-Drop Rubber-Banding

The optimistic state update already exists (lines 826-828 for channels, 863-864 for sections). The rubber-banding happens because the realtime listener at line 447 calls `load()` on every `postgres_changes` event for the `channels` table, which re-fetches all channels from the DB and overwrites the optimistic state.

**File: `src/components/server/ChannelSidebar.tsx`**

1. **Add a "skip next realtime reload" ref** — After an optimistic DnD update, set a ref flag (e.g., `skipNextRealtimeRef.current = true`) with a short timeout (1.5s). When the realtime listener fires, check this flag and skip the `load()` call if set. This prevents the DB round-trip from overwriting the optimistic state.

2. **Wrap DB persistence in try/catch with rollback** — In `handleChannelDrop` and `handleSectionDrop`, save the previous channels array before the optimistic update. If any DB update fails, revert `setChannels` to the saved array and show an error toast.

3. **Add visual drag cues** — Apply `opacity-50` to the dragged channel item (already done at line 1030 for voice channels). Ensure the same applies to text channel rows. The drop indicator line (`h-0.5 bg-primary`) is already present at line 1028.

4. **Batch the position updates** — Instead of awaiting N sequential updates in a loop (lines 832-834, 867-869), fire all updates in parallel with `Promise.all` to reduce the window where realtime events could conflict.

### Files to modify
- `supabase/functions/livekit-token/index.ts` — Fix import
- `src/components/server/ChannelSidebar.tsx` — Add skip-realtime ref, try/catch rollback, parallel DB writes

