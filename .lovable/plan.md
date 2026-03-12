

# Stability Fix: Silent Disconnects in Voice Channels

## Root Cause Analysis

After reviewing the code, three issues can cause silent kicks:

1. **No reconnection policy configured on the Room.** The `Room` is created with only `adaptiveStream` and `dynacast`. When a transient network blip or WebSocket hiccup occurs (common during screen sharing due to high bandwidth usage), LiveKit's default reconnect behavior may give up quickly. There is no explicit `reconnectPolicy` configured, so the SDK uses a minimal default.

2. **No user-facing reconnection events.** The hook only listens for `RoomEvent.Disconnected`. It does not handle `RoomEvent.Reconnecting` or `RoomEvent.Reconnected`, meaning users get no warning and no chance for the SDK to recover before `onDisconnected` fires cleanup logic.

3. **Edge function sequential queries.** The `livekit-token` function runs 3 sequential `await` calls (auth claims → profile → channel+server). Under load, this chain can approach edge function CPU/wall-clock limits, causing a 500 error during token refresh or initial connect.

## Plan

### File 1: `src/hooks/useLiveKitRoom.ts`

**A. Add reconnection policy to Room constructor:**
```typescript
const room = new Room({
  adaptiveStream: true,
  dynacast: true,
  reconnectPolicy: {
    maxRetries: 7,
    initialDelay: 300,    // ms
    maxDelay: 10_000,     // ms
    backoffMultiplier: 2,
  },
});
```
This gives the SDK up to ~7 retries with exponential backoff (300ms → 600ms → 1.2s → ... → 10s cap) before giving up — covering transient network issues that last up to ~30 seconds.

**B. Add `Reconnecting` and `Reconnected` event handlers:**
- On `RoomEvent.Reconnecting`: set a new state (e.g., `callState = "reconnecting"`) so the UI can show a "Reconnecting..." indicator instead of silently dying.
- On `RoomEvent.Reconnected`: restore `callState` to `"connected"` and re-sync participants/tracks (they may have changed during the blip).
- Update the `CallState` type to include `"reconnecting"`.

**C. Add `SignalReconnecting` handler:** Log and handle signal-layer reconnects separately from full ICE reconnects for better diagnostics.

### File 2: `supabase/functions/livekit-token/index.ts`

**A. Parallelize DB queries:** Run the profile fetch and the channel→server boost-level fetch concurrently using `Promise.all` instead of sequentially. This cuts the function's wall-clock time roughly in half.

**B. Set explicit token TTL:** Add `ttl: "24h"` to the `AccessToken` options. While the default is 6 hours (sufficient for most sessions), setting an explicit 24-hour TTL prevents any edge case where users in long sessions get kicked due to token expiry.

### File 3: `src/components/server/VoiceConnectionBar.tsx`

**A. Handle the new `"reconnecting"` state:** When `lk.callState === "reconnecting"`, show a toast or visual indicator so users know the connection is recovering, not dead. Currently `onDisconnected` fires cleanup immediately — ensure it only fires on terminal `"ended"` state, not during reconnection attempts.

## Summary of Changes

| File | Change |
|---|---|
| `src/hooks/useLiveKitRoom.ts` | Add `reconnectPolicy`, handle `Reconnecting`/`Reconnected` events, add `"reconnecting"` to `CallState` |
| `supabase/functions/livekit-token/index.ts` | Parallelize profile + boost queries with `Promise.all`, set `ttl: "24h"` on token |
| `src/components/server/VoiceConnectionBar.tsx` | Guard cleanup so it only fires on terminal disconnect, not during reconnection |

