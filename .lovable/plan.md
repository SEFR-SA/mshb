

## Plan: Desktop-First Polling/Realtime Pattern for Server Boost

### Overview
Three changes across two files to fix the Electron white-page issue and add realtime UI sync.

### Step 1: Hardcode Production URL for Success/Cancel URLs
In both `ServerBoostPage.tsx` (line 118-123) and `ServerBoostModal.tsx` (line 58-63), replace `window.location.href.split("#")[0]` with the production URL `https://mshb.vercel.app`.

```typescript
const PROD_BASE = "https://mshb.vercel.app";
// ...
success_url: `${PROD_BASE}/#/boost/success?server_id=${serverId}`,
cancel_url: `${PROD_BASE}/#/boost/cancel?server_id=${serverId}`,
```

### Step 2: "Awaiting Payment" State in ServerBoostPage.tsx
Add a new `awaitingPayment` state. After `window.open` succeeds, set it to `true` instead of resetting `boosting`. The button shows "Awaiting Payment..." and helper text appears below it. Same treatment for the sticky bar button.

### Step 3: Realtime Subscription on `user_boosts` Table
Add a `useEffect` in `ServerBoostPage.tsx` that subscribes to `postgres_changes` on the `user_boosts` table filtered by the current user's ID. On `INSERT` events where `server_id` matches:

1. Show a success toast
2. Refetch server boost data (boost_count, boost_level) and user boost count
3. Reset `awaitingPayment` to `false`

The subscription cleans up on unmount. This makes the UI update instantly when the webhook fires, regardless of popup window behavior.

### Step 4: Same Realtime + URL Fix in ServerBoostModal.tsx
Apply the production URL fix. Add a simpler realtime listener that shows a toast and closes the modal on boost completion.

### Files Modified
- `src/pages/ServerBoostPage.tsx` — all three steps
- `src/components/server/ServerBoostModal.tsx` — production URL + basic realtime

### No Database Changes Required
The `user_boosts` table already has realtime enabled and appropriate RLS policies for SELECT.

