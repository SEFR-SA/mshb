

## Speaking Indicator Using Realtime Presence

### Problem
The broadcast approach keeps failing because `supabase.channel('same-name')` returns the same instance — so the sender and listener collide. No matter how we rename channels, any component sharing a channel name will hit this issue.

### Solution: Supabase Realtime Presence
Instead of broadcast, use **Presence** on the existing voice signaling channel. Each user tracks their own `isSpeaking` state via `channel.track()`, and any subscriber (including ChannelSidebar) can read presence state via `channel.presenceState()` and the `presence` event.

This is exactly how Discord implements it — each voice participant's client reports its own speaking state, and all listeners receive presence diffs.

### How It Works

1. **VoiceConnectionManager** joins a presence channel (`voice-presence-${channelId}`) and calls `channel.track({ userId, isSpeaking: true/false })` whenever the volume monitor detects a change.

2. **ChannelSidebar** subscribes to the same presence channel (`voice-presence-${channelId}`) and listens for `sync` events. On each sync, it reads `channel.presenceState()` to determine which users are speaking. Since presence is designed for multiple subscribers, there is no collision.

3. The speaking indicator will show as a **green pulsing ring around the avatar** (like Discord) combined with the existing **green mic icon** next to the name for maximum visibility.

### Changes

**`src/components/server/VoiceConnectionBar.tsx`**

- Remove the `speakingChannelRef` broadcast approach entirely
- Create a presence channel: `supabase.channel('voice-presence-${channelId}')`
- Subscribe to presence and call `.track({ userId, isSpeaking })` from the `updateSpeaking` callback
- Clean up on unmount with `.untrack()` and `.unsubscribe()`

**`src/components/server/ChannelSidebar.tsx`**

- Replace the broadcast listener with a presence listener on `voice-presence-${chId}`
- Listen for `presence` `sync` events
- On each sync, iterate `channel.presenceState()` to build the set of currently-speaking user IDs
- Keep the green `Mic` icon and add back the green ring on the avatar for speaking users

### Technical Details

```
VoiceConnectionManager (per user in voice channel):
  presenceChannel = supabase.channel('voice-presence-${channelId}')
  presenceChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      presenceChannel.track({ userId, isSpeaking: false })
    }
  })

  // When volume monitor detects change:
  presenceChannel.track({ userId, isSpeaking: true/false })

ChannelSidebar (listener):
  presenceChannel = supabase.channel('voice-presence-sidebar-${chId}')
  // Use a DIFFERENT channel name with "-sidebar" suffix so it's a separate instance
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState()
      // Build speakingUsers set from state
    })
    .subscribe()
```

Wait -- the same-name problem applies to presence channels too. So the sidebar must use a **different channel name** but still listen to presence. Unfortunately, presence only works within the same channel name.

### Revised Approach: Broadcast with Unique Sender Name

Since presence shares the same channel-name limitation, the real fix is simpler: give the **sender** a unique channel name with a random suffix, and have it broadcast to a **well-known channel name** that only the sidebar subscribes to.

Actually, the cleanest fix: the VoiceConnectionManager should NOT subscribe to the speaking channel -- it should only **send** on it. The issue is that `.send()` requires the channel to be subscribed. But we can work around this by ensuring the VoiceConnectionManager subscribes but does NOT register any `.on()` handlers, while the sidebar subscribes with `.on()` handlers.

The real problem is that `supabase.channel('X')` returns the cached instance if it already exists. So if VoiceConnectionManager creates it first, the sidebar gets that same object. The fix:

**Use the signaling channel (which only VoiceConnectionManager has) to send broadcasts, and give the sidebar its own uniquely-named channel that listens differently.**

### Final Correct Approach: Database-Driven Speaking State

To completely avoid channel naming issues, store speaking state ephemerally in the `voice_channel_participants` table (add an `is_speaking` boolean column). The VoiceConnectionManager updates the row, and the ChannelSidebar receives updates via the existing postgres_changes subscription.

### Changes (Final)

**Database Migration**
- Add `is_speaking BOOLEAN DEFAULT false` column to `voice_channel_participants`

**`src/components/server/VoiceConnectionBar.tsx`**
- Remove all broadcast-based speaking logic (speakingChannelRef, broadcast sends)
- In `updateSpeaking`, do a simple database update:
  ```sql
  UPDATE voice_channel_participants SET is_speaking = true/false
  WHERE channel_id = X AND user_id = Y
  ```
- Add debouncing to avoid excessive DB writes (only update when state changes, which the volume monitor already handles)

**`src/components/server/ChannelSidebar.tsx`**
- Remove the broadcast-based speaking listener entirely (the useEffect with `voice-speaking-listen`)
- Remove `speakingUsers` state
- Instead, include `is_speaking` in the `fetchVoiceParticipants` query (it already subscribes to postgres_changes on this table)
- Use `p.is_speaking` directly in the render to show the green mic icon

This approach is:
- Bulletproof: no channel name collisions possible
- Simple: leverages the existing realtime subscription on `voice_channel_participants`
- Already wired: the sidebar already listens to postgres_changes on this table

### Files Modified
- **Database migration**: Add `is_speaking` column to `voice_channel_participants`
- **`src/components/server/VoiceConnectionBar.tsx`**: Replace broadcast speaking with DB update
- **`src/components/server/ChannelSidebar.tsx`**: Remove broadcast listener, use `is_speaking` from DB query; show green ring + mic icon for speaking users

