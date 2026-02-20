
## Bug Analysis & Fix Plan

Three distinct bugs need to be fixed. Here's what's wrong with each and exactly how to fix it.

---

### Bug 1: Mute/Unmute/Deafen/Undeafen Sounds Not Playing

**Root Cause — AudioContext Suspended State**

Browsers enforce an "autoplay policy": a `new AudioContext()` created before any user gesture starts in a `suspended` state. The `playSyntheticTone()` function in `src/lib/soundManager.ts` calls `getAudioContext()` which creates the context, but if it was never resumed by user interaction, `ctx.currentTime` is stuck at `0` and the oscillators are scheduled but produce no audible output.

The fix is to call `audioCtx.resume()` before scheduling tones inside `playSyntheticTone`. This ensures the context is running before any nodes are started.

**File:** `src/lib/soundManager.ts`

```typescript
// Inside playSyntheticTone — add resume() before scheduling
async function playSyntheticTone(...) {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") {
      await ctx.resume();  // ← ADD THIS
    }
    const now = ctx.currentTime;
    // ... rest of scheduling unchanged
  }
}
```

Because this is now async we also need `playSound` to `await` it (or fire-and-forget with `.catch`). We'll use fire-and-forget to keep the call-site simple.

---

### Bug 2: Call History Pills Not Appearing After a Call

**Root Cause — Two Problems Working Together**

**Problem A — Missing `type` column in insert from `Chat.tsx`:**
When the caller's call is missed or declined (lines 214–223 in `Chat.tsx`), the insert is done **without** `type: 'call_notification'`. It only sets `content` with the emoji prefix. The pill renderer checks `type === 'call_notification'` first, and these messages fall through the emoji-prefix fallback, but the content still starts with `📵` as a raw emoji.

However there's a deeper issue — the `Chat.tsx` "callee-declined" handler (the `useEffect` on line 200–233) inserts messages using the old emoji-prefix format without `type: 'call_notification'`. This needs to be unified.

**Problem B — Real-time subscription doesn't update the local `messages` state:**
The pill-insert goes directly to the database. The Supabase realtime listener in `Chat.tsx` listens for new messages on the thread and would pick them up — but only if it's subscribed and re-reads. The `callSessionId` is cleared before the insert resolves, which can cause the subscription to be torn down. We need to ensure the insert happens before state is reset.

**Fix:**
1. In `Chat.tsx` (lines 200–233), change the insert to use `type: 'call_notification'` and clean content (no emoji prefix).
2. Ensure `setCallSessionId(null)` and `setIsCallerState(false)` are called **after** the DB insert, not before.
3. In `CallListener.tsx`, the callee-side `handleDecline` already correctly inserts with `type: 'call_notification'` — no change needed there.
4. The `handleCallEnded` in `Chat.tsx` (lines 76–96) also inserts without `type` — fix this too.

---

### Bug 3: 3-Minute Auto-Timeout Not Working (Callee Side)

**Root Cause — Timeout fires but callee message insert is silent, and no UI reset happens for caller**

Looking at `CallListener.tsx` lines 166–182: the timeout fires for the **callee** (the user receiving the call), inserts a "Missed call" message, and updates `call_sessions.status = 'missed'`. This then triggers the `postgres_changes` subscription in `Chat.tsx` (caller side, lines 200–233), which should call `endCall()` and insert its own message.

The problem: the **caller** `useEffect` in `Chat.tsx` watching for status changes inserts a message `📵 ${otherN} missed your call` **without** `type: 'call_notification'`. So it won't render as a pill. The same fix from Bug 2 covers this.

However there's an additional issue: in `CallListener.tsx`, the auto-timeout `setTimeout` sets the timeout when the `incomingCall` state is set, but the `activeSession` variable captured in the outer `useEffect` closure is stale (it's from the time the effect ran). If another call was started, the `if (activeSession) return` guard on line 143 prevents showing the dialog — but the timeout reference is not always cleared when `incomingCall` is dismissed manually (e.g. declined). 

**Fix:**
- Ensure `clearTimeout_()` is called in `handleDecline` in `CallListener.tsx` — it already does this ✓
- The main issue is the timeout fires but uses a stale `profile` closure. We'll make the timeout capture the thread and profile data from `session` directly (already done correctly), but we must also ensure the `timeoutRef` is properly cleared on component unmount (already done ✓).

The real remaining issue: when the 3-minute timeout fires on the **callee** in `CallListener.tsx`, it calls `setIncomingCall(null)` — but it does NOT reset `incomingCall` UI in a way that would tell the **caller** immediately. The `call_sessions.status = 'missed'` update is what signals the caller. This relies on the realtime subscription in `Chat.tsx`. Let's verify this subscription is set up while the `callSessionId` is set — it is (the effect at line 201 depends on `callSessionId`).

**Summary of timeout fix:** The timeout logic itself is correct, but the **caller-side system message** is inserted without `type: 'call_notification'` — same fix as Bug 2 resolves the pill display.

---

## Files to Change

### `src/lib/soundManager.ts`
- Make `playSyntheticTone` async and add `await ctx.resume()` before scheduling oscillators
- Update `playSound` to call `playSyntheticTone(...).catch(() => {})` for fire-and-forget async

### `src/pages/Chat.tsx`
Three inserts need `type: 'call_notification'` and cleaned content:

1. **`handleCallEnded`** (line ~85–91): already sets `type: 'call_notification'` ✓
2. **The callee-status `useEffect`** (lines 214–223): currently inserts with emoji prefix and **no `type`** — fix to use `type: 'call_notification'` and clean text like `"${otherN} declined your call"` or `"${otherN} missed your call"`
3. Ensure `setCallSessionId(null)` is called **after** awaiting the insert (currently the order is: `endCall()` → `setCallSessionId(null)`, but the insert is inside an async block before `endCall()`, so ordering should be fine — just add the `type` fix)

### Technical Summary

```text
Bug 1 — Sound fix:
  soundManager.ts: playSyntheticTone → async, add await ctx.resume()

Bug 2 & 3 — Pill fix (same root cause):
  Chat.tsx lines ~219-223: add type: 'call_notification', remove emoji prefix
  Chat.tsx: ensure all message inserts on call events use type: 'call_notification'
```
