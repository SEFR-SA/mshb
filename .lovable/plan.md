

# LiveKit Migration Audit — Analysis Complete

## Summary

After thorough analysis of all files involved in the 7-phase LiveKit migration, the implementation is **solid overall**. Zero references to legacy P2P code remain (`RTCPeerConnection`, `optimizeSDPForGaming`, `createVolumeMonitor`, `pcRef`, `screenSenderRef`, `cameraSenderRef` — all confirmed absent). The `useWebRTC.ts` file has been deleted.

However, I identified **3 issues** that should be addressed:

---

## Issue 1: Triple Realtime Subscription on `call_sessions` (DM Calls)

**Severity: Medium — causes redundant event handling and potential double `endCall()` invocations**

When a DM call is active, three separate Realtime channels subscribe to the same `call_sessions` row:

1. **`useLiveKitCall.ts` line 67-101** — `call-session-{sessionId}` — calls `lk.disconnect()` + `endCall` on status change
2. **`CallListener.tsx` line 208-240** — `call-status-caller-{activeSession}` — calls `endCall()` on status change (caller side)
3. **`CallListener.tsx` line 242-260** — `call-status-callee-{activeSession}` — calls `endCall()` on status change (callee side)

When a call ends, **both** `useLiveKitCall`'s internal listener AND `CallListener`'s listener fire. The `endedRef` guard in `useLiveKitCall` prevents the double-disconnect at the LiveKit level, but `onEnded` callback may fire twice — once from `useLiveKitCall`'s internal listener and once from `CallListener`'s explicit `endCall()`. This causes `handleCallEnded` to run twice (double "Call ended" system messages, double sound effects).

**Fix:** Remove the internal Realtime subscription from `useLiveKitCall.ts` (lines 67-101) since `CallListener.tsx` already handles all status-change logic with proper sound effects and system messages. The hook should only manage LiveKit connection state, not duplicate the call-session monitoring.

---

## Issue 2: `useLiveKitRoom` Stale Closure in `syncParticipants`

**Severity: Low — cosmetic, may cause brief stale speaking indicators**

`syncParticipants` (line 85) depends on `activeSpeakers` state, but this creates a stale closure issue. When `activeSpeakers` updates, `syncParticipants` is recreated, but the Room event handlers (registered at connect time on lines 182-207) still reference the old `syncParticipants`. The effect on line 455-457 partially mitigates this by re-syncing when `activeSpeakers` changes, but event-driven syncs (e.g., `ParticipantConnected`) still use stale speaker data.

**Fix:** Use a ref for `activeSpeakers` inside `syncParticipants` instead of direct state dependency, or move the speaking check to use the ref at read time.

---

## Issue 3: `useLiveKitCall` Creates Room Even With Empty `roomName`

**Severity: Low — no crash, but wasteful**

When `sessionId` is null, `useLiveKitRoom` is called with `roomName: ""`. The `connect()` function would try to fetch a token with an empty room name if accidentally invoked. The guards in `startCall`/`answerCall` prevent this in practice, but a defensive check in `connect()` would be cleaner.

**Fix:** Add `if (!roomName) return;` at the top of `useLiveKitRoom.connect()`.

---

## Verified Working Correctly

- **Server voice channels**: `VoiceConnectionBar` correctly uses `useLiveKitRoom`, syncs speaking/mute/deafen to DB, handles screen share and camera via custom events, manages AFK timers, and cleans up on unmount.
- **DM calls (Chat.tsx)**: Correctly uses `useLiveKitCall` for initiating calls from the chat page.
- **DM calls (CallListener.tsx)**: Correctly handles incoming calls, ringtones, accept/decline, auto-timeout, system messages, and navigation.
- **Multi-stream grid (StreamGrid.tsx)**: Properly renders single/multi/spotlight modes.
- **VoiceChannelContext**: Legacy single-stream fields auto-sync from the array. Cleanup on disconnect is thorough.
- **Audio bitrate enforcement**: Boost level is correctly read from participant metadata and applied during mic publish.
- **Data channel**: Soundboard and entrance sounds work via LiveKit data messages.
- **No legacy P2P code remains**: Zero references to WebRTC signaling, ICE candidates, or peer connections.

---

## Recommended Plan

1. **Remove duplicate Realtime subscription** from `useLiveKitCall.ts` (lines 67-101) — the `CallListener` already handles all call-session status monitoring with proper UX (sounds, messages).

2. **Fix stale closure** in `useLiveKitRoom.syncParticipants` — use a ref for `activeSpeakers`.

3. **Add guard** for empty `roomName` in `useLiveKitRoom.connect()`.

### Technical Details

**File: `src/hooks/useLiveKitCall.ts`**
- Remove the `useEffect` block (lines 65-101) that subscribes to `call-session-{sessionId}` Realtime channel
- This eliminates the double `onEnded` firing issue

**File: `src/hooks/useLiveKitRoom.ts`**
- Add `const activeSpeakersRef = useRef(activeSpeakers)` and keep it synced
- Use the ref inside `syncParticipants` instead of direct state
- Add `if (!roomName) return;` at the top of `connect()`

