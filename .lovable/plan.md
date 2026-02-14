

## Fix: Voice Call UI Not Appearing

### Root Cause

In `Chat.tsx`, the `initiateCall` function does:

```typescript
setCallSessionId(data.id);    // React state update (batched, not immediate)
setIsCallerState(true);        // Also batched
setTimeout(() => startCall(), 500);  // startCall still sees sessionId = null
```

The `startCall` function from `useWebRTC` is a memoized callback that captures `sessionId` from the **current render**. Even after 500ms, React may have re-rendered, but the `startCall` reference inside `initiateCall`'s closure is still the old one where `sessionId` was `null`. So it hits `if (!sessionId) return;` and does nothing.

### Solution

**1. `src/hooks/useWebRTC.ts`** -- Make `startCall` accept an optional `overrideSessionId` parameter so it doesn't depend on React state timing:

```typescript
const startCall = useCallback(async (overrideSessionId?: string) => {
  const sid = overrideSessionId || sessionId;
  if (!sid) return;
  setCallState("ringing");
  const pc = await setupPeerConnection();
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  setTimeout(() => {
    channelRef.current?.send({
      type: "broadcast",
      event: "call-offer",
      payload: { sdp: offer },
    });
  }, 1000);
}, [sessionId, setupPeerConnection]);
```

**2. `src/pages/Chat.tsx`** -- Pass the session ID directly to `startCall` instead of relying on state:

```typescript
const initiateCall = async () => {
  if (!threadId || !user || !otherId || callSessionId) return;
  const { data } = await supabase
    .from("call_sessions")
    .insert({ caller_id: user.id, callee_id: otherId, thread_id: threadId } as any)
    .select("id")
    .single();
  if (data) {
    setCallSessionId(data.id);
    setIsCallerState(true);
    // Pass session ID directly -- don't rely on state update
    setTimeout(() => startCall(data.id), 500);
  }
};
```

**3. Also fix the signaling channel setup** -- The `useEffect` in `useWebRTC` that sets up the broadcast channel (line 106) depends on `sessionId`. But since `startCall` may fire before the channel effect runs, the `channelRef.current` may still be `null` when the offer is sent. To fix this, `startCall` should also set up the channel inline if it's not yet available, or we ensure the channel is ready before sending the offer.

The safest approach: in `startCall`, if `channelRef.current` is null, create and subscribe the channel inline before sending the offer.

### Files to Modify

| File | Changes |
|------|--------|
| `src/hooks/useWebRTC.ts` | Add `overrideSessionId` param to `startCall`; ensure channel is ready before sending offer |
| `src/pages/Chat.tsx` | Pass `data.id` directly to `startCall(data.id)` |

### Expected Result

Clicking "Start Voice Call" will immediately show the ringing UI with the pulsing avatar animation and "Calling..." text, regardless of React state timing.

