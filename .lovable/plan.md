

## Analysis: Cancel URL Already Implemented

The `cancel_url` flow is **already fully wired up** across all three layers:

1. **Frontend** (`ServerBoostPage.tsx:123`): Passes `cancel_url: \`${base}#/boost/cancel?server_id=${serverId}\`` in the checkout request body
2. **Edge Function** (`create-streampay-checkout/index.ts:221`): Forwards it to StreamPay as `failure_redirect_url: cancel_url`
3. **Route + Page** (`App.tsx:219` + `BoostCancel.tsx`): Route exists and renders a cancellation UI with a "Return to App" button

### One Improvement to Make

The cancel page currently navigates to `/` (root). Since the `server_id` is already in the URL query params, we should use it to navigate users back to their specific server boost page instead.

**File: `src/pages/BoostCancel.tsx`**
- Import `useSearchParams` from `react-router-dom`
- Read `server_id` from query params
- Change the button's `onClick` from `navigate("/")` to `navigate(\`/server/${serverId}/boost\`)` when `serverId` is available, falling back to `/` otherwise
- Add a second button "Return to Server" or update the existing one accordingly

This is a single-file, ~5-line change.

