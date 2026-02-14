

## Universal Mute and Deafen Buttons

### Overview
Add persistent mute and deafen toggle buttons next to the user's name/avatar at the bottom of the desktop sidebar. These work as a global audio preference -- when muted/deafened, any voice channel or 1-to-1 call the user joins will start with mic disabled / audio disabled, and the user must manually unmute/undeafen to talk/listen.

### How It Works

1. **Global State via React Context**: Create a new `AudioSettingsContext` that stores `globalMuted` and `globalDeafened` booleans. This context wraps the app so all voice components can read it.

2. **Sidebar UI**: Next to the user avatar in `AppLayout.tsx`, add two icon buttons:
   - **Mic / MicOff**: Toggles global mute
   - **Headphones / HeadphoneOff** (custom via lucide): Toggles global deafen (deafen also implies mute)

3. **Integration with Server Voice (`VoiceConnectionBar.tsx`)**:
   - On mount (joining a voice channel), read `globalMuted` and `globalDeafened` from context
   - If globally muted, disable mic track immediately after acquiring it
   - If globally deafened, also mute all incoming audio elements
   - The bar's local mute button syncs with the global state

4. **Integration with 1-to-1 Calls (`useWebRTC.ts`)**:
   - After `getUserMedia`, check global mute/deafen state and disable tracks accordingly
   - Remote audio playback is suppressed when deafened
   - Accept an `initialMuted` and `initialDeafened` parameter

5. **Visual Feedback**: When globally muted, the mic icon turns red with a slash. When deafened, the headphones icon turns red. Both states persist across navigation.

### Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/contexts/AudioSettingsContext.tsx` | Create | Context providing `globalMuted`, `globalDeafened`, toggle functions |
| `src/components/layout/AppLayout.tsx` | Modify | Add mic and deafen buttons next to user avatar at bottom of sidebar |
| `src/components/server/VoiceConnectionBar.tsx` | Modify | Read global mute/deafen on join; sync local state; suppress remote audio when deafened |
| `src/hooks/useWebRTC.ts` | Modify | Accept initial mute/deafen; apply on setup; suppress remote audio when deafened |
| `src/components/chat/CallListener.tsx` | Modify | Pass global mute/deafen state to useWebRTC |
| `src/components/chat/VoiceCallUI.tsx` | Modify | Add deafen toggle button alongside mute |
| `src/App.tsx` | Modify | Wrap app with `AudioSettingsProvider` |
| `src/i18n/en.ts` | Modify | Add mute/deafen translation keys |
| `src/i18n/ar.ts` | Modify | Add Arabic mute/deafen translations |

### Technical Details

**AudioSettingsContext:**
```typescript
interface AudioSettings {
  globalMuted: boolean;
  globalDeafened: boolean;
  toggleGlobalMute: () => void;
  toggleGlobalDeafen: () => void;
}
```
- Deafen implies mute: toggling deafen ON also sets muted ON
- Toggling deafen OFF only undeafens; mute stays as-is unless explicitly toggled

**AppLayout sidebar addition (next to user avatar):**
```text
[Mic/MicOff] [Headphones/HeadphoneOff]  [Avatar] Username
                                                  status text
```

**VoiceConnectionBar integration:**
- After `getUserMedia`, if `globalMuted`: `stream.getAudioTracks().forEach(t => t.enabled = false)`
- Store remote audio elements in a ref array; when `globalDeafened` changes, set `.muted` on all of them
- Subscribe to context changes to live-toggle during an active session

**useWebRTC integration:**
- Store remote `Audio` elements in a ref
- On `globalDeafened` change, toggle `.muted` on all remote audio elements
- On `globalMuted` change, toggle `localStream.getAudioTracks()[0].enabled`

