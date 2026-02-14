

## Fix VoiceConnectionBar Layout and Voice Channel Hover Issue

### Issue 1: VoiceConnectionBar - Disconnect Button Position

The current layout pushes the disconnect button to the far right because the inner div has `flex-1`, creating a spacer effect. The disconnect button needs to sit immediately next to the channel name, not separated by flex spacing.

**Current layout:** `[green dot] [volume] [channelName] [avatars .......... spacer] [PhoneOff]`
**Target layout:** `[green dot] [volume] [channelName] [PhoneOff] [avatars]`

**File: `src/components/server/VoiceConnectionBar.tsx`**
- Restructure the JSX so the `PhoneOff` disconnect button comes right after the channel name
- Move participant avatars to after the disconnect button (or remove `flex-1` from the inner div)
- Remove `flex-1 min-w-0` from the inner wrapper so items stay compact

### Issue 2: Voice Channel Hover Stays After Joining

In `ChannelSidebar.tsx`, when a voice channel is clicked (joined), it gets `activeVoiceChannelId` matching, which applies `bg-sidebar-accent` permanently. The user wants NO persistent highlight on voice channels — only a hover effect that appears on mouse hover and disappears when not hovering.

**File: `src/components/server/ChannelSidebar.tsx`**
- Remove the active state styling for voice channels (remove the `ch.id === activeVoiceChannelId` conditional that applies `bg-sidebar-accent`)
- Keep only the hover effect: `hover:bg-sidebar-accent/50` for all voice channels regardless of whether they are joined
- The voice channel's "active" state is already visually indicated by the `VoiceConnectionBar` at the bottom and the green icon when participants are present

### Issue 3: Clean Up Dead Code - VoiceChannelPanel

`VoiceChannelPanel.tsx` is not imported or used anywhere in the app. It still contains local mute/disconnect controls. It should be deleted as dead code.

**File: `src/components/server/VoiceChannelPanel.tsx`**
- Delete this file entirely (it is unused)

### Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/server/VoiceConnectionBar.tsx` | Modify | Move disconnect button right after channel name |
| `src/components/server/ChannelSidebar.tsx` | Modify | Remove persistent active highlight on voice channels; keep hover-only |
| `src/components/server/VoiceChannelPanel.tsx` | Delete | Remove unused dead code |

