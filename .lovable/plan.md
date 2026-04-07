
## What I found

There are 2 separate blockers:

1. **The voice token backend is still down**
   - Client logs show: `Failed to send a request to the Edge Function`
   - Backend logs show the real cause: `livekit-token` is crashing at boot because `https://esm.sh/livekit-server-sdk@2.9.1` fails with the `Duration` export error.
   - If this function cannot boot, users never receive a token, so there is no real LiveKit connection, no incoming audio, and no active-speaker events.

2. **Remote audio is not being managed correctly in the client**
   - `src/hooks/useLiveKitRoom.ts` currently calls `track.attach()` for remote audio, but it does not keep or render the returned `<audio>` element anywhere.
   - That means subscribed audio tracks are not reliably attached to persistent DOM audio elements.

The green mic path is mostly already there:
- `useLiveKitRoom.ts` already listens to `RoomEvent.ActiveSpeakersChanged`
- `VoiceConnectionBar.tsx` already maps local speaking state into `voice_channel_participants.is_speaking`
- `ChannelSidebar.tsx` already renders the green mic from `p.is_speaking`

So I would **not** refactor the whole architecture. I would fix the broken connection first, then make the audio attachment and speaking-state propagation reliable.

## Implementation plan

### 1. Repair the token backend
**File:** `supabase/functions/livekit-token/index.ts`

- Replace the current broken `esm.sh` `livekit-server-sdk` import with an edge-runtime-safe import approach.
- Keep the existing token payload, permission checks, room naming, and grants exactly as they are.
- Before redeploying, verify the backend still has the required LiveKit secrets:
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`
  - `LIVEKIT_WS_URL`

Why this matters:
- Right now the function never boots, so the rest of the voice stack cannot work at all.

### 2. Persist remote audio elements in the DOM
**File:** `src/hooks/useLiveKitRoom.ts`

Add a minimal audio element manager inside the hook:

- Create a hidden audio container once for the room session.
- Keep a `Map` of remote audio elements keyed by track SID (or participant identity + track SID).
- On `RoomEvent.TrackSubscribed`:
  - if the track is remote audio, create/reuse an `<audio autoPlay playsInline>` element
  - call `track.attach(audioEl)`
  - append it to the hidden container
- On initial connect:
  - walk existing remote participants and attach any already-published audio tracks the same way
- On `RoomEvent.TrackUnsubscribed`:
  - `track.detach(audioEl)`
  - remove the `<audio>` element from the DOM
  - delete it from the map
- On disconnect/unmount:
  - remove all managed audio elements and clear the map

Why this matters:
- This is the missing piece for “I can see them in channel but cannot hear them.”

### 3. Make the speaking indicator update reliably even when realtime is flaky
**File:** `src/components/server/VoiceConnectionBar.tsx`

Keep the current DB-backed UI flow, but harden it:

- Continue using `lk.activeSpeakers.has(user.id)` as the source for local speaking state
- When `is_speaking` changes and the row is updated in `voice_channel_participants`, immediately dispatch the already-existing `voice-participants-changed` window event
- Also force `is_speaking = false` during disconnect/cleanup so stale green mics do not linger

Why this matters:
- `ChannelSidebar.tsx` already listens for `voice-participants-changed` and refetches participants
- Your logs show multiple Realtime `TIMED_OUT` / `CLOSED` events, so this gives the green mic a reliable fallback without refactoring the sidebar

### 4. Leave the UI rendering layer mostly untouched
**Files not expected to change:** `src/components/server/ChannelSidebar.tsx` unless a tiny follow-up is needed

- The sidebar already renders:
  - muted/deafened icons
  - green mic from `p.is_speaking`
- I would keep that as-is and feed it better data, instead of adding a new parallel state path

## Files to modify

1. `supabase/functions/livekit-token/index.ts`
2. `src/hooks/useLiveKitRoom.ts`
3. `src/components/server/VoiceConnectionBar.tsx`

## Technical details

```text
Current flow
Channel join -> fetch token -> connect room -> subscribe tracks -> audio should play
                                      \
                                       -> ActiveSpeakersChanged -> update DB -> sidebar refetch -> green mic

Broken today
livekit-token boot failure -> no token -> no room connection
and
remote audio attach() result is not persisted in DOM
and
speaking UI depends on flaky realtime without a fallback refetch trigger
```

## Validation checklist after implementation

1. Join the same voice channel with 2 accounts
2. Confirm `livekit-token` returns 200 and the room connects
3. Confirm each user hears the other immediately after join
4. Confirm the green mic appears while speaking and clears when silent
5. Confirm leaving the channel removes audio cleanly and clears speaking state

## Scope guard

I will keep this tightly scoped:
- no token/grant redesign
- no permission logic changes
- no voice UI redesign
- no refactor of sidebar structure
- only the backend token boot issue, remote audio DOM attachment, and reliable speaking-state propagation
