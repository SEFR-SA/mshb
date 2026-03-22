
Investigation results

I cannot reliably click the right-click voice context menu from automation because browser automation does not support native/custom context-menu interactions well, so I verified this by tracing the code paths and checking live backend data for your current server/voice rows.

What I found

1. Server Mute / Server Deafen are partially working in the backend
- The moderation RPC exists and is no longer ambiguous:
  - `server_moderate_voice_user(uuid, uuid, boolean, boolean)`
  - `has_role_permission(uuid, uuid, text, boolean)`
- In the live database, I found a participant row in the `voice` channel where:
  - `server_muted = true`
  - `server_deafened = true`
- That proves the mute/deafen action is successfully writing to the backend for at least one user.

2. The voice-channel participant list is showing the wrong icons
In `src/components/server/ChannelSidebar.tsx`, `fetchVoiceParticipants()` selects only:
```ts
.select("channel_id, user_id, is_speaking, is_muted, is_deafened, is_screen_sharing")
```
But later it maps:
```ts
server_muted: !!(d as any).server_muted,
server_deafened: !!(d as any).server_deafened,
```
Those fields were never selected, so they are always `undefined -> false`.

Then the rendered row icons use only:
```ts
p.is_deafened ? HeadphoneOff : p.is_muted ? MicOff : ...
```
So:
- server mute does not show the mute icon
- server deafen does not show the deafen icon
- only self-muted/self-deafened states are reflected visually

This is a confirmed bug.

3. Server mute/deafen enforcement is one-way only
In `src/components/server/VoiceConnectionBar.tsx`, the realtime listener does this:

```ts
if (row.server_muted) {
  room?.localParticipant.setMicrophoneEnabled(false);
  setGlobalMuted(true);
}

if (row.server_deafened) {
  room?.localParticipant.setMicrophoneEnabled(false);
  setGlobalMuted(true);
  ...
  setGlobalDeafened(true);
}
```

Problems:
- It handles turning moderation on
- It does not handle turning moderation off
- If a moderator un-mutes or un-deafens a user, the local client state is not restored/reset
- `setIsServerMuted` / `setIsServerDeafened` are updated both ways, but the actual audio behavior only changes on the `true` branch

So from the target user’s side:
- server mute/deafen may appear stuck
- unmute/undeafen may not fully take effect until reconnect or manual toggling

4. There is also a likely loading/state mismatch in the moderation menu
`VoiceUserContextMenu.tsx` fetches the target’s `server_muted/server_deafened` only once on mount:
```ts
useEffect(() => {
  ...
  .maybeSingle()
  .then(({ data }) => {
    setServerMuted(...)
    setServerDeafened(...)
  });
}, [isSelf, channelId, targetUserId]);
```
There is no realtime subscription for that menu state.
So if the moderation state changes elsewhere, the menu label can become stale until reopened/remounted.

Answer to your question

From my side:
- The backend mute/deafen action appears to be working.
- The UI indication is not working correctly.
- The target-user enforcement is incomplete, especially when moderation is removed.
- So overall, I would say: not fully working.

Plan to fix

1. Fix participant query to include moderation fields
Update `ChannelSidebar.tsx` so `fetchVoiceParticipants()` selects:
```ts
server_muted, server_deafened
```
This makes the row data accurate.

2. Fix displayed icons to respect server moderation
Update the participant row rendering so it treats:
- `server_deafened || is_deafened` as deafened
- `server_muted || is_muted` as muted

Priority should match Discord-style behavior:
```text
deafened state wins over muted state
```

3. Fix target-side enforcement for both ON and OFF transitions
Update the realtime moderation listener in `VoiceConnectionBar.tsx` so it handles both cases:
- when `server_muted` becomes true: force mic off
- when `server_muted` becomes false: clear the forced moderation state without leaving the client stuck
- when `server_deafened` becomes true: force deafen behavior
- when `server_deafened` becomes false: restore remote audio playback and clear forced deafen state

This is the most important behavioral fix.

4. Make moderation menu state live/accurate
Add a realtime subscription in `VoiceUserContextMenu.tsx` for the target participant row, or refresh state after each moderation action, so menu labels stay in sync.

5. Verify owner/admin behavior is still intact
After the fix, confirm:
- owner can mute/deafen anyone appropriate
- muted users show mic-off icon
- deafened users show headphone-off icon
- unmute/undeafen clears the forced state correctly

Files to update
- `src/components/server/ChannelSidebar.tsx`
- `src/components/server/VoiceConnectionBar.tsx`
- `src/components/server/VoiceUserContextMenu.tsx`

Technical detail
```text
Current state flow

VoiceUserContextMenu
  -> rpc(server_moderate_voice_user)
  -> updates voice_channel_participants.server_muted/server_deafened

But then:

ChannelSidebar
  -> does NOT select server_muted/server_deafened
  -> cannot render correct icons

VoiceConnectionBar
  -> listens for row updates
  -> enforces only when flags become true
  -> does not properly reverse enforcement when flags become false
```
