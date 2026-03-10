

## Plan: Window Close Detection for Payment Popup

### Problem
When the user closes the StreamPay popup manually, the "Awaiting Payment..." state persists indefinitely because nothing resets `awaitingPayment`.

### Solution
Capture the `window.open` reference and poll its `.closed` property every 500ms. When closed, reset the awaiting state and show a toast. Clear the interval on component unmount or when the realtime subscription fires first (successful payment).

### Changes

**File 1: `src/pages/ServerBoostPage.tsx`**
- Add a `useRef` for the polling interval ID (`windowCheckRef`)
- In `handleBoost` (line 165): capture `const paymentWindow = window.open(...)`, then start a `setInterval` polling `paymentWindow.closed`
- When closed detected: clear interval, reset `awaitingPayment(false)`, show info toast
- In the realtime subscription callback (line 125): also clear the interval via the ref so it stops polling after a successful payment
- Add cleanup `useEffect` return that clears the interval on unmount

**File 2: `src/components/server/ServerBoostModal.tsx`**
- Same pattern: `useRef` for interval, capture window ref in `handleBoost` (line 122), poll `.closed`, clear on success or unmount

### Key Code Pattern
```typescript
const windowCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

// In handleBoost, after window.open:
const paymentWindow = window.open(url, '_blank');
windowCheckRef.current = setInterval(() => {
  if (paymentWindow?.closed) {
    clearInterval(windowCheckRef.current!);
    windowCheckRef.current = null;
    setAwaitingPayment(false);
    toast({ title: "Payment window closed" });
  }
}, 500);

// In realtime callback, on success:
if (windowCheckRef.current) {
  clearInterval(windowCheckRef.current);
  windowCheckRef.current = null;
}

// Cleanup on unmount:
useEffect(() => {
  return () => {
    if (windowCheckRef.current) clearInterval(windowCheckRef.current);
  };
}, []);
```

Two files, ~15 lines added to each.

