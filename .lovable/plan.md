

## Fix Speaking Indicator - Channel Name Mismatch

### Root Cause
The previous fix changed the ChannelSidebar listener to `voice-speaking-listen-${chId}`, but the VoiceConnectionManager still sends speaking broadcasts on `voice-signal-${channelId}` (via `channelRef.current`). Since these are different channel names, the sidebar never receives speaking events.

### Solution
In `VoiceConnectionManager`, send `voice-speaking` broadcasts on a dedicated channel matching what the sidebar listens to (`voice-speaking-listen-${channelId}`), instead of piggybacking on the signaling channel. Additionally, switch from the ring approach to showing a green mic icon next to speaking users -- this is more visible and reliable at small avatar sizes.

### Changes

**`src/components/server/VoiceConnectionBar.tsx`**

1. Create a separate broadcast channel for speaking state: `voice-speaking-listen-${channelId}`
2. Update the `updateSpeaking` callback to send on this dedicated channel instead of `channelRef.current`
3. Clean up this channel on unmount

**`src/components/server/ChannelSidebar.tsx`** (line 438-448)

4. Replace the `ring-2 ring-[#00db21]` avatar styling with a green `Mic` icon that appears next to the user's name when they are speaking:
   - Remove the ring class from the Avatar
   - Add a green `Mic` icon (`text-[#00db21]`) that conditionally renders when `speakingUsers.has(p.user_id)` is true

### Technical Details

The dedicated speaking channel approach:
- VoiceConnectionManager creates `supabase.channel('voice-speaking-listen-${channelId}')` and subscribes
- Speaking updates are sent via this channel's `.send()` method
- ChannelSidebar already listens on `voice-speaking-listen-${chId}` -- no changes needed on that side
- The signaling channel (`voice-signal-${channelId}`) remains untouched for WebRTC offers/answers/ICE

### Files Modified
- `src/components/server/VoiceConnectionBar.tsx` -- send speaking broadcasts on dedicated channel
- `src/components/server/ChannelSidebar.tsx` -- replace ring with green mic icon for speaking users

