

## Fix Speaking Ring Not Showing

### Root Cause
The ChannelSidebar (line 182) subscribes to `voice-signal-${chId}` to listen for `voice-speaking` broadcasts. However, VoiceConnectionManager (line 97) already creates and subscribes to a channel with the exact same name (`voice-signal-${channelId}`). In Supabase Realtime, `supabase.channel('same-name')` returns the same channel instance -- so the sidebar's `.on("broadcast", ...)` handler is added to an already-subscribed channel and never fires.

### Fix
Use a distinct channel name for the sidebar's speaking listener so it gets its own independent subscription.

### Changes

**`src/components/server/ChannelSidebar.tsx`** (line 182)

Change the channel name from:
```
supabase.channel(`voice-signal-${chId}`)
```
to:
```
supabase.channel(`voice-speaking-listen-${chId}`)
```

This ensures the sidebar gets its own channel subscription that properly receives the `voice-speaking` broadcast events, while the VoiceConnectionManager keeps its separate channel for signaling (offers, answers, ICE candidates).

### Files Modified
- `src/components/server/ChannelSidebar.tsx` -- rename the speaking broadcast listener channel to avoid collision

