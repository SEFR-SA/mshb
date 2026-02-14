

## Add Voice Channel Switch Confirmation Dialog

### Problem
When a user is already in a voice channel and clicks another one, they end up appearing in both channels simultaneously. The `handleVoiceChannelSelect` in `ServerView.tsx` simply sets the new voice channel state without first disconnecting from the old one, and the `VoiceConnectionBar` component (which handles the actual WebRTC cleanup) gets unmounted/remounted without proper sequencing.

### Solution
Add a confirmation dialog in `ServerView.tsx` that intercepts voice channel switches. When a user is already connected to a voice channel and clicks a different one:

1. Show an AlertDialog asking "You Sure?" with the message "Looks like you're in another voice channel. Are you sure you want to switch to [channel name]?"
2. On "Confirm": first clean up the old voice channel (delete the participant row from the database), then set the new voice channel
3. On "Cancel": do nothing

### Changes

**`src/pages/ServerView.tsx`**
- Add state for the pending voice channel switch (`pendingVoiceChannel`) and a boolean for dialog visibility (`switchDialogOpen`)
- Update `handleVoiceChannelSelect`: if `voiceChannel` is already set and the new channel is different, store the pending channel and open the dialog instead of switching immediately
- Add a `confirmSwitch` handler that:
  - Deletes the user's row from `voice_channel_participants` for the old channel
  - Sets the new `voiceChannel` state (this unmounts the old `VoiceConnectionBar` and mounts a new one which auto-joins)
- Add an `AlertDialog` component to the JSX
- Import `AlertDialog` components and add translation keys

**`src/i18n/en.ts`**
- Add keys: `channels.switchVoice`, `channels.switchVoiceDesc`, `common.confirm`, `common.cancel` (if not already present)

**`src/i18n/ar.ts`**
- Add matching Arabic translations

### How It Works

1. User clicks a voice channel while already in another
2. Dialog appears: "You Sure?" / "Looks like you're in another voice channel. Are you sure you want to switch to [name]?"
3. User clicks "Confirm" -> old participant row is deleted from DB, new voice channel is set, `VoiceConnectionBar` remounts and auto-joins the new channel
4. User clicks "Cancel" -> nothing happens, user stays in current channel

### Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/pages/ServerView.tsx` | Modify | Add switch confirmation dialog and sequenced leave/join logic |
| `src/i18n/en.ts` | Modify | Add switch confirmation translation keys |
| `src/i18n/ar.ts` | Modify | Add Arabic translations |

