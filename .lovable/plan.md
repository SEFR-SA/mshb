
## Fix Voice Call UI Not Appearing

### Issues Identified

1. **Silent failure in `setupPeerConnection()`**: The `useWebRTC.ts` hook calls `navigator.mediaDevices.getUserMedia()` at line 57 without try-catch error handling. If the microphone isn't accessible (common in preview/test environments), the promise rejects silently and `setCallState("ringing")` never executes because the component fails before returning the peer connection.

2. **Timing issue with sessionId**: In `Chat.tsx`, the `initiateCall()` function:
   - Inserts a call session into the database
   - Sets `callSessionId` state
   - Calls `startCall()` after a 500ms timeout
   - However, `startCall()` depends on `sessionId` being non-null, and it's created from the `useWebRTC` hook which receives `callSessionId` as a prop
   - The timeout helps, but it's unreliable

### Solution

**File: `src/hooks/useWebRTC.ts`**
- Wrap `navigator.mediaDevices.getUserMedia()` in a try-catch block
- Log errors to console for debugging
- If getUserMedia fails, still set `callState = "ringing"` so the UI appears
- The UI will show but audio won't work - this allows testing the UI/UX without microphone access
- Add console.error for debugging

**File: `src/pages/Chat.tsx`** (optional improvement)
- Ensure the call state is properly initialized before calling functions
- The current implementation should work with the above fix, but we can make it more robust

### Technical Details

**In `useWebRTC.ts`, `setupPeerConnection()` function:**
```typescript
const setupPeerConnection = useCallback(async () => {
  try {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStreamRef.current = stream;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    // ... rest of code
  } catch (error) {
    console.error('[WebRTC] getUserMedia failed:', error);
    // Still return a peer connection so the UI can work
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;
    pc.onconnectionstatechange = () => {
      // ... existing logic
    };
    return pc;
  }
}, [cleanup, startDurationTimer]);
```

This allows the ringing UI to appear even without microphone access, making it testable in sandbox/preview environments.

### Files to Modify

| File | Change |
|------|--------|
| `src/hooks/useWebRTC.ts` | Add try-catch around `getUserMedia()` call in `setupPeerConnection()` function |

### Expected Result

- When clicking "Start Voice Call", the ringing UI panel will appear with the other user's avatar and "Calling..." text
- The connected state will appear when both users accept the call (if both have audio access)
- If microphone is unavailable, the UI still renders for testing purposes, with an error logged to console
