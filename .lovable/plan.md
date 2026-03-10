

## Analysis: StreamPay Cancel Button Issue

The problem is **not in our code** — it's about how the StreamPay hosted checkout page works. We are correctly passing the `failure_redirect_url` (cancel URL) to StreamPay. However, StreamPay's hosted payment page apparently does not render a visible "Cancel" or "Back" button for the user.

Since we cannot control StreamPay's hosted UI, the fix is to **open the StreamPay checkout in a new tab** instead of navigating away. This way:
- The user can simply **close the tab** to cancel
- The original Server Boost page remains open in the background
- No dependency on StreamPay providing a cancel button

### Changes

**File: `src/pages/ServerBoostPage.tsx` (line 130)**
- Change `window.location.href = res.data.payment_url` to `window.open(res.data.payment_url, '_blank')`

**File: `src/components/server/ServerBoostModal.tsx` (line 74)**
- Same change: `window.open(res.data.payment_url, '_blank')`

This is a 2-line change across 2 files. The user stays on the boost page and can return to it at any time by switching tabs.

