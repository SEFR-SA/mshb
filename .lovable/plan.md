

## Pin Chat, Toggle Profile Panel, and 1-to-1 Voice Calls

### 1. Pin Chat to Top of Sidebar

**Database**: Create a `pinned_chats` table to store which threads a user has pinned.

```sql
CREATE TABLE public.pinned_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  thread_id uuid REFERENCES public.dm_threads(id) ON DELETE CASCADE,
  group_thread_id uuid REFERENCES public.group_threads(id) ON DELETE CASCADE,
  pinned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pinned_chats_one_target CHECK (
    (thread_id IS NOT NULL AND group_thread_id IS NULL) OR
    (thread_id IS NULL AND group_thread_id IS NOT NULL)
  ),
  UNIQUE(user_id, thread_id),
  UNIQUE(user_id, group_thread_id)
);

ALTER TABLE public.pinned_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own pins" ON public.pinned_chats
  FOR ALL TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

**UI Changes**:
- Add a "Pin Chat" / "Unpin Chat" button in the chat header (both `Chat.tsx` and `GroupChat.tsx`)
- In `ChatSidebar.tsx`, query `pinned_chats` and sort pinned items to the top with a small pin icon indicator
- Pinned chats are separated visually with a "Pinned" label above them

---

### 2. Show/Hide User Profile Panel

**Changes to `Chat.tsx`**:
- Add `showProfile` state (default `true`)
- Add a toggle button (eye/user icon) in the chat header
- Conditionally render `<UserProfilePanel>` based on `showProfile`

**Changes to `GroupChat.tsx`**:
- Same pattern: `showMembers` state with toggle button in header
- Conditionally render `<GroupMembersPanel>`

No database changes needed -- this is purely client-side UI state.

---

### 3. Voice Calls (1-to-1)

This is the major feature. The approach uses **WebRTC** for peer-to-peer audio with Supabase Realtime as the signaling layer (no external services needed).

#### How it works

```text
Caller                    Supabase Realtime              Callee
  |                            |                           |
  |-- broadcast "call-offer" ->|-- delivers to callee ---->|
  |                            |                           |
  |<--- "call-answer" --------|<---- callee accepts -------|
  |                            |                           |
  |--- ICE candidates ------->|<--- ICE candidates --------|
  |                            |                           |
  |<========== WebRTC P2P Audio Connection =============>  |
```

#### Database

```sql
CREATE TABLE public.call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  thread_id uuid REFERENCES public.dm_threads(id),
  status text NOT NULL DEFAULT 'ringing',
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.call_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own calls" ON public.call_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

CREATE POLICY "Users create calls" ON public.call_sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users update own calls" ON public.call_sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = callee_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.call_sessions;
```

#### New Components

**`src/hooks/useWebRTC.ts`** -- Custom hook encapsulating all WebRTC logic:
- Creates `RTCPeerConnection` with public STUN servers
- Handles creating/answering offers via SDP exchange
- Manages ICE candidate exchange through a Supabase Realtime broadcast channel
- Exposes: `startCall()`, `answerCall()`, `endCall()`, `isMuted`, `toggleMute()`, `callDuration`, `connectionState`

**`src/components/chat/VoiceCallUI.tsx`** -- In-chat call bar that appears at the top of the chat panel when a call is active:
- Shows call status (ringing, connected, ended)
- Displays call duration timer
- Mute/unmute button
- End call button
- Caller/callee avatar and name

**`src/components/chat/IncomingCallDialog.tsx`** -- A modal/overlay shown when receiving an incoming call:
- Shows caller avatar and name
- Accept (green phone) and Decline (red phone) buttons
- Plays a ringtone sound
- Auto-dismisses after 30 seconds if no answer

#### Call Flow

1. **Caller** clicks "Start Voice Call" button in chat header
2. A `call_sessions` row is inserted with status `ringing`
3. Caller joins a Supabase Realtime broadcast channel `call-{sessionId}`
4. **Callee** detects the new `call_sessions` row via Realtime subscription (postgres_changes on `call_sessions`)
5. `IncomingCallDialog` appears for the callee
6. If callee **accepts**:
   - Callee joins the same broadcast channel
   - WebRTC offer/answer/ICE exchange happens via broadcast messages
   - `call_sessions.status` updated to `connected`, `started_at` set
   - Both users see `VoiceCallUI` bar in the chat
7. If callee **declines** or timeout:
   - `call_sessions.status` updated to `declined` or `missed`
8. Either user clicks **End Call**:
   - `call_sessions.status` updated to `ended`, `ended_at` set
   - WebRTC connection closed

#### Global Incoming Call Listener

A new component `src/components/chat/CallListener.tsx` will be added to `AppLayout.tsx` to listen for incoming calls globally (so the user receives the call notification regardless of which page they're on).

---

### 4. i18n Strings

Add to `en.ts` and `ar.ts`:

```
chat: {
  ...existing,
  pinChat: "Pin Chat",
  unpinChat: "Unpin Chat",
  pinned: "Pinned",
  showProfile: "Show Profile",
  hideProfile: "Hide Profile",
  startCall: "Start Voice Call",
},
calls: {
  incoming: "Incoming Call",
  calling: "Calling...",
  connected: "Connected",
  ended: "Call Ended",
  declined: "Call Declined",
  missed: "Missed Call",
  accept: "Accept",
  decline: "Decline",
  endCall: "End Call",
  mute: "Mute",
  unmute: "Unmute",
  duration: "Duration",
}
```

---

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | **Create** -- `pinned_chats` + `call_sessions` tables |
| `src/hooks/useWebRTC.ts` | **Create** -- WebRTC + signaling hook |
| `src/components/chat/VoiceCallUI.tsx` | **Create** -- in-chat call bar |
| `src/components/chat/IncomingCallDialog.tsx` | **Create** -- incoming call overlay |
| `src/components/chat/CallListener.tsx` | **Create** -- global call listener |
| `src/pages/Chat.tsx` | **Modify** -- add pin, profile toggle, call button + call UI |
| `src/pages/GroupChat.tsx` | **Modify** -- add pin, members panel toggle |
| `src/components/chat/ChatSidebar.tsx` | **Modify** -- fetch pinned chats, sort to top |
| `src/components/layout/AppLayout.tsx` | **Modify** -- add CallListener |
| `src/i18n/en.ts` | **Modify** -- add new strings |
| `src/i18n/ar.ts` | **Modify** -- add Arabic translations |

### Technical Notes

- WebRTC uses only free public STUN servers (`stun:stun.l.google.com:19302`) for NAT traversal. No TURN server is included, which means calls may fail if both users are behind strict/symmetric NATs. This covers the majority of real-world scenarios.
- All signaling goes through Supabase Realtime broadcast channels (no edge functions needed).
- Call history is persisted in `call_sessions` for future reference.

