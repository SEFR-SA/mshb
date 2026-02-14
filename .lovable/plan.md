

## Fix Mute/Deafen & Add Voice Status Indicators

### Problem
The mute and deafen buttons in the channel sidebar toggle UI state (`globalMuted`/`globalDeafened` in AudioSettingsContext) but the VoiceConnectionBar never reacts to these changes. The local audio tracks are not disabled and remote audio elements are not muted, so the buttons have no actual effect.

### Fix 1: Make Mute Actually Work

**`src/components/server/VoiceConnectionBar.tsx`**

Add a `useEffect` that watches `globalMuted` and toggles the local audio stream's tracks:
- When `globalMuted` becomes `true`, disable all audio tracks on `localStreamRef.current`
- When `globalMuted` becomes `false`, re-enable them

### Fix 2: Make Deafen Actually Work

**`src/components/server/VoiceConnectionBar.tsx`**

Add a `useEffect` that watches `globalDeafened` and mutes/unmutes all remote audio elements:
- When `globalDeafened` becomes `true`, set `audio.muted = true` on every element in `remoteAudiosRef`
- When `globalDeafened` becomes `false`, set `audio.muted = false`
- Also update the existing `pc.ontrack` handler (line 115) to use a ref for deafened state so new audio elements respect the current deafen state

### Fix 3: Sync Mute/Deafen State to Database

**Database migration**: Add `is_muted` and `is_deafened` boolean columns (default `false`) to `voice_channel_participants`

**`src/components/server/VoiceConnectionBar.tsx`**

Add a `useEffect` that watches `globalMuted` and `globalDeafened` and updates the participant's row in `voice_channel_participants`.

### Fix 4: Show Mute/Deafen Indicators Next to Participant Names

**`src/components/server/ChannelSidebar.tsx`**

- Update the `VoiceParticipant` interface to include `is_muted` and `is_deafened`
- Update `fetchVoiceParticipants` to also select `is_muted, is_deafened`
- In the participant list (around line 423-435), add icons next to the user's name:
  - If `is_deafened`: show a `HeadphoneOff` icon (red)
  - Else if `is_muted`: show a `MicOff` icon (red)
  - The existing speaking indicator (green mic) should only show when the user is NOT muted

---

### Technical Details

**Mute effect** (new in VoiceConnectionBar):
```text
useEffect(() => {
  localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !globalMuted; });
}, [globalMuted]);
```

**Deafen effect** (new in VoiceConnectionBar):
```text
useEffect(() => {
  remoteAudiosRef.current.forEach(a => { a.muted = globalDeafened; });
}, [globalDeafened]);
```

**DB update effect** (new in VoiceConnectionBar):
```text
useEffect(() => {
  if (!user || !isJoined) return;
  supabase.from("voice_channel_participants")
    .update({ is_muted: globalMuted, is_deafened: globalDeafened })
    .eq("channel_id", channelId)
    .eq("user_id", user.id)
    .then();
}, [globalMuted, globalDeafened, isJoined, user, channelId]);
```

**Participant indicator** (updated in ChannelSidebar):
```text
{p.is_deafened ? (
  <HeadphoneOff className="h-3 w-3 text-destructive shrink-0" />
) : p.is_muted ? (
  <MicOff className="h-3 w-3 text-destructive shrink-0" />
) : p.is_speaking ? (
  <Mic className="h-3 w-3 text-[#00db21] shrink-0 animate-pulse" />
) : null}
```

### Files Modified
- **New migration**: add `is_muted` and `is_deafened` columns to `voice_channel_participants`
- `src/components/server/VoiceConnectionBar.tsx` -- add effects for mute, deafen, and DB sync
- `src/components/server/ChannelSidebar.tsx` -- update participant interface, query, and display with mute/deafen icons
