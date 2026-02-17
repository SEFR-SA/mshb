

## Multi-Feature Update: Voice Controls, Profile Popover, Calls, and Reply System

This plan covers 5 distinct fixes/features requested:

### 1. User Volume Slider -- Actually Controls Audio

**Problem**: The volume slider in `VoiceUserContextMenu` only updates local state; it never touches the actual WebRTC audio.

**Solution**: Store per-user volume settings in the `VoiceChannelContext` so that the voice connection bar (where audio elements are created) can apply `HTMLAudioElement.volume` to each remote participant's audio.

- Add a `userVolumes` map (`Record<string, number>`) to `VoiceChannelContext`
- Add `setUserVolume(userId, volume)` function
- In `VoiceUserContextMenu`, call `setUserVolume` when the slider changes instead of local state
- In `ServerView.tsx` (or wherever remote audio elements are created for voice channels), apply `audioElement.volume = userVolumes[userId] ?? 1` whenever the map changes
- Mute button sets volume to 0; unmute restores to 100

### 2. Admin Disconnect -- Fix RLS Policy

**Problem**: The current RLS DELETE policy on `voice_channel_participants` only allows `auth.uid() = user_id`. Admins cannot delete other users' rows.

**Solution**: Update the RLS policy to also allow server admins:

```sql
DROP POLICY "Users can leave voice channels" ON voice_channel_participants;
CREATE POLICY "Users can leave or admins disconnect" ON voice_channel_participants
  FOR DELETE USING (
    auth.uid() = user_id
    OR is_server_admin(auth.uid(), (SELECT channels.server_id FROM channels WHERE channels.id = voice_channel_participants.channel_id))
  );
```

### 3. View Profile -- Show Popover Instead of Navigating

**Problem**: "View Profile" just navigates to `/server/:id`, which is useless.

**Solution**: Replace navigation with opening a profile popover dialog. Create a small `UserProfilePopover` dialog component that:
- Fetches the target user's profile (avatar, banner, about_me, etc.)
- Fetches their server membership (role, joined_at)
- Renders the same popover content already used in `ServerMemberList.tsx` but inside a Dialog
- Wire `VoiceUserContextMenu` to open this dialog via state

### 4. Call Button -- Actually Initiate a Call

**Problem**: `handleCall` in `VoiceUserContextMenu` just navigates to the DM thread but doesn't start a call.

**Solution**: After navigating to the DM thread, dispatch a custom event that `Chat.tsx` listens for to auto-initiate a call. Or simpler: navigate to `/chat/:threadId?call=true`, and in `Chat.tsx` check for `?call=true` to auto-trigger `initiateCall()`.

### 5. Reply System Refactor (Major Feature)

**Database**: Add `reply_to_id` column (nullable UUID) to the `messages` table.

**Reply UI Above Messages**:
- When rendering a message that has `reply_to_id`, show a compact preview above it with:
  - A small vertical line connector (left border)
  - Original sender's name (truncated)
  - Original message text (truncated to ~80 chars)
  - Slightly transparent/muted styling
- Clicking the preview scrolls to the original message (using `scrollIntoView` with the message ID as ref)

**Input State (Replying Mode)**:
- Add `replyingTo` state: `{ id: string, authorName: string, content: string } | null`
- When clicking "Reply" in context menu, set this state instead of prepending `> text`
- Show a "Replying to [Name]" bar above the input with an X to cancel
- When sending, include `reply_to_id` in the insert payload, then clear `replyingTo`

**Files affected**:
- Migration: add `reply_to_id` column
- `MessageContextMenu.tsx`: change `onReply` to pass message ID + author + content
- `Chat.tsx`: add `replyingTo` state, reply bar UI, pass `reply_to_id` on send, fetch replied-to messages, render reply previews, scroll-to logic
- `GroupChat.tsx`: same reply system
- `ServerChannelChat.tsx`: same reply system

---

### Technical Details

| Change | Files |
|---|---|
| Migration: RLS fix + reply_to_id | New SQL migration |
| Volume control | `VoiceChannelContext.tsx`, `VoiceUserContextMenu.tsx`, `ServerView.tsx` or voice audio handler |
| View Profile dialog | `VoiceUserContextMenu.tsx` (add Dialog), reuse popover content from `ServerMemberList` |
| Call button | `VoiceUserContextMenu.tsx` (navigate with ?call=true), `Chat.tsx` (auto-call on param) |
| Reply system | `MessageContextMenu.tsx`, `Chat.tsx`, `GroupChat.tsx`, `ServerChannelChat.tsx` |
| i18n | `en.ts`, `ar.ts` -- new keys for reply bar |

### Reply Preview Component

A new inline component (or section within each chat page) will render:

```
  [thin colored border] AuthorName: "truncated original message..."
  [actual message bubble below]
```

Clicking the preview calls `document.getElementById(replyToId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })` and briefly highlights the target message.

### Reply Input Bar

Appears above the composer:
```
 Replying to AuthorName                    [X]
```
Styled with a left accent border and muted background.

