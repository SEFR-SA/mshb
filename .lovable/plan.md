

## Persist Voice Channel Across Navigation + 1-Hour Idle Auto-Disconnect

### Problem
`VoiceConnectionManager` is rendered inside `ServerView.tsx`. When navigating to Friends, Inbox, or any other page, `ServerView` unmounts, causing `VoiceConnectionManager` to unmount and trigger its cleanup (which disconnects from voice, stops streams, and removes the DB participant row).

### Fix: Move VoiceConnectionManager to AppLayout

**`src/components/layout/AppLayout.tsx`**

- Import `VoiceConnectionManager` and `useVoiceChannel`
- Render `VoiceConnectionManager` at the layout level (outside of `<Outlet />`), conditionally when `voiceChannel` is not null
- This ensures the voice connection survives navigation between pages

**`src/pages/ServerView.tsx`**

- Remove the `VoiceConnectionManager` rendering (both mobile and desktop blocks)
- The voice connection is now managed at the layout level, so ServerView no longer needs it

### Add 1-Hour Idle Auto-Disconnect

**`src/components/server/VoiceConnectionBar.tsx`**

- Add an idle timer that tracks the last time the user was speaking (via the existing volume monitor)
- Reset the timer every time `is_speaking` becomes `true`
- If 1 hour passes without any speaking activity, automatically disconnect:
  - Call `onDisconnect()` to clear voice channel context
  - The cleanup effect handles the rest (closing peers, removing DB row, etc.)

---

### Technical Details

**AppLayout change:**
```text
// Inside AppLayout, after <Outlet />
{voiceChannel && (
  <VoiceConnectionManager
    channelId={voiceChannel.id}
    channelName={voiceChannel.name}
    serverId={voiceChannel.serverId}
    onDisconnect={disconnectVoice}
  />
)}
```

**Idle timer logic in VoiceConnectionBar:**
```text
const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

// Reset idle timer whenever user speaks
const resetIdleTimer = useCallback(() => {
  if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
  idleTimerRef.current = setTimeout(() => {
    onDisconnect(); // auto-disconnect after 1 hour idle
  }, 60 * 60 * 1000); // 1 hour
}, [onDisconnect]);

// Start idle timer on join, reset on speaking
// In the volume monitor callback: if isSpeaking, call resetIdleTimer()
// Clear timer on unmount
```

### Files Modified
- `src/components/layout/AppLayout.tsx` -- render VoiceConnectionManager at layout level
- `src/pages/ServerView.tsx` -- remove VoiceConnectionManager rendering
- `src/components/server/VoiceConnectionBar.tsx` -- add 1-hour idle auto-disconnect timer

