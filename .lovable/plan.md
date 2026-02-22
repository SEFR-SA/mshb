

## Bug Fixes

### Bug 1: "Call ended" pill duplicated 4 times

**Root Cause:** Two separate components both insert call notification messages independently:

- `Chat.tsx` has its own `handleCallEnded` (line 76-96) that inserts "Call ended" into the database, AND its own realtime watcher (lines 200-240) that inserts missed/declined messages.
- `CallListener.tsx` has its own `handleCallEnded` (line 81-108) that also inserts "Call ended", AND its own realtime watcher (lines 192-225) for missed/declined.

Both components create their own `useWebRTC` instance with `onEnded` callbacks. When either user hangs up, **both** components fire for **each** user, producing 4 duplicate messages total.

**Fix:** Remove ALL call notification insertion logic from `Chat.tsx` and let `CallListener.tsx` be the single owner of system message insertion. Specifically:

1. **`Chat.tsx` `handleCallEnded`** (lines 76-96): Remove the database insert. Keep only `stopAllLoops()`, `playSound("call_end")`, and state cleanup (`setCallSessionId(null)`, `setIsCallerState(false)`).

2. **`Chat.tsx` caller-status `useEffect`** (lines 200-240): Remove the `insertCallSystemMessage` calls for missed/declined. Keep only `stopAllLoops()`, `playSound("call_end")`, `endCall()`, and state cleanup.

3. `CallListener.tsx` already correctly handles all notification insertions -- no changes needed there.

This ensures exactly one notification per call event: one from User A's `CallListener` or one from User B's `CallListener`, not both.

---

### Bug 2: Fullscreen for screen share doesn't actually go fullscreen

**Root Cause:** The `ScreenShareViewer` component uses `requestFullscreen()` on the container div, which should trigger true browser fullscreen. However, the video element inside has `max-h-[500px]` and the container has `min-h-[300px] max-h-[500px]`, which constrain the video even when the container is in fullscreen mode. The browser makes the element fill the viewport, but the CSS max-height prevents the content from expanding.

**Fix:** Add fullscreen-aware styles to `ScreenShareViewer.tsx`:

1. When `isFullscreen` is true, remove the `max-h` constraints from both the outer container and the video element, and add `w-screen h-screen` to ensure the content fills the entire screen.
2. The video wrapper should use `flex-1` in fullscreen to take all remaining space after the toolbar.
3. The video element should have no max-height constraint in fullscreen.

---

### Technical Details

**Files to modify:**

| File | Change |
|------|--------|
| `src/pages/Chat.tsx` | Remove DB insert from `handleCallEnded`; remove notification inserts from caller-status watcher `useEffect` |
| `src/components/server/ScreenShareViewer.tsx` | Add conditional fullscreen classes to remove height constraints and fill the screen |

**`Chat.tsx` -- simplified `handleCallEnded`:**
```typescript
const handleCallEnded = useCallback(async () => {
  stopAllLoops();
  playSound("call_end");
  callStartRef.current = null;
  setCallSessionId(null);
  setIsCallerState(false);
}, []);
```

**`Chat.tsx` -- simplified caller-status watcher:**
```typescript
// Only handle UI state, no DB inserts
if (status === "ended" || status === "declined" || status === "missed") {
  stopAllLoops();
  if (status !== "ended") playSound("call_end");
  endCall();
  setCallSessionId(null);
  setIsCallerState(false);
}
```

**`ScreenShareViewer.tsx` -- fullscreen-aware classes:**
```tsx
<div ref={containerRef} className={cn(
  "flex flex-col bg-background",
  isFullscreen ? "w-screen h-screen" : "border-b border-border"
)}>
  {/* ... toolbar ... */}
  <div className={cn(
    "flex items-center justify-center bg-black/90",
    isFullscreen ? "flex-1" : "min-h-[300px] max-h-[500px]"
  )}>
    <video
      className={cn(
        "w-full h-full object-contain",
        !isFullscreen && "max-h-[500px]"
      )}
    />
  </div>
</div>
```

