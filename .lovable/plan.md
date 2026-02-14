

## Fix Voice Call Answer and End Call

### Problems Found

1. **Answer Call fails silently**: Same stale closure bug that was fixed for `startCall`. When the callee clicks "Accept", `handleAccept` sets `activeSession` state, then calls `answerCall()` via setTimeout. But `answerCall` captures `sessionId` from the previous render (which was `null`), so `if (!sessionId) return` exits immediately. No peer connection is created, no signaling channel is joined.

2. **End Call doesn't reach the other side**: Since `answerCall` never ran, the callee has no signaling channel. Clicking "End Call" sends a broadcast on a nonexistent channel. Additionally, the caller (in `Chat.tsx`) never listens for database status changes on the call session, so even the database update to "ended" or "declined" has no effect on the caller's UI.

### Solution

**File: `src/hooks/useWebRTC.ts`**
- Add an optional `overrideSessionId` parameter to `answerCall` (same pattern used for `startCall`)
- Inside `answerCall`, set up the signaling channel inline if not already present, using the override ID
- This ensures the callee joins the correct broadcast channel and sets up the peer connection

**File: `src/components/chat/CallListener.tsx`**
- Update `handleAccept` to pass `incomingCall.sessionId` directly to `answerCall(incomingCall.sessionId)` instead of relying on state
- Remove the 500ms setTimeout since `answerCall` will handle channel setup inline
- Add a listener for database status changes on the active call session. When the caller ends the call (updating status to "ended" in the database), the callee detects the change and cleans up
- Similarly, add a listener on the caller side in `Chat.tsx` for when the callee declines

**File: `src/pages/Chat.tsx`**
- Add a realtime listener on the `call_sessions` table for status changes (filtered by the active `callSessionId`). When status changes to "ended" or "declined", clean up the caller's call state

### Technical Details

**`useWebRTC.ts` - answerCall fix:**
```typescript
const answerCall = useCallback(async (overrideSessionId?: string) => {
  const sid = overrideSessionId || sessionId;
  if (!sid) return;
  setCallState("ringing");

  // Ensure signaling channel is ready
  if (!channelRef.current) {
    const channel = supabase.channel(`call-${sid}`);
    channelRef.current = channel;
    channel
      .on("broadcast", { event: "call-offer" }, async ({ payload }) => {
        const pc = pcRef.current;
        if (!pc) return;
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        await processQueuedCandidates();
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        channel.send({
          type: "broadcast",
          event: "call-answer",
          payload: { sdp: answer },
        });
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        // ... handle ICE candidates
      })
      .on("broadcast", { event: "call-end" }, () => {
        cleanup();
      })
      .subscribe();
  }

  await setupPeerConnection();
}, [sessionId, setupPeerConnection, cleanup, processQueuedCandidates]);
```

**`CallListener.tsx` - handleAccept fix:**
```typescript
const handleAccept = useCallback(async () => {
  if (!incomingCall) return;
  setActiveSession(incomingCall.sessionId);
  setIsCaller(false);
  setOtherName(incomingCall.callerName);

  await supabase
    .from("call_sessions")
    .update({ status: "connected", started_at: new Date().toISOString() })
    .eq("id", incomingCall.sessionId);

  setIncomingCall(null);
  // Pass session ID directly to bypass stale closure
  answerCall(incomingCall.sessionId);
}, [incomingCall, answerCall]);
```

**`CallListener.tsx` - Listen for caller ending the call:**
```typescript
useEffect(() => {
  if (!activeSession) return;
  const channel = supabase
    .channel(`call-status-${activeSession}`)
    .on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "call_sessions",
      filter: `id=eq.${activeSession}`,
    }, (payload) => {
      const status = (payload.new as any).status;
      if (status === "ended" || status === "declined") {
        endCall();
      }
    })
    .subscribe();
  return () => { channel.unsubscribe(); };
}, [activeSession, endCall]);
```

**`Chat.tsx` - Listen for callee declining/ending:**
```typescript
useEffect(() => {
  if (!callSessionId) return;
  const channel = supabase
    .channel(`call-status-${callSessionId}`)
    .on("postgres_changes", {
      event: "UPDATE",
      schema: "public",
      table: "call_sessions",
      filter: `id=eq.${callSessionId}`,
    }, (payload) => {
      const status = (payload.new as any).status;
      if (status === "ended" || status === "declined") {
        endCall();
        setCallSessionId(null);
        setIsCallerState(false);
      }
    })
    .subscribe();
  return () => { channel.unsubscribe(); };
}, [callSessionId, endCall]);
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useWebRTC.ts` | Add `overrideSessionId` param to `answerCall`; inline channel setup |
| `src/components/chat/CallListener.tsx` | Pass sessionId directly to `answerCall`; add DB status listener for call end |
| `src/pages/Chat.tsx` | Add DB status listener so caller detects decline/end from callee |

### Expected Result

- Clicking "Answer Call" will properly join the signaling channel and establish the WebRTC connection
- Clicking "End Call" on either side will terminate the call for both users
- Declining a call will stop the ringing UI on the caller side

