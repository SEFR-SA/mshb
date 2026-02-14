

## Speaking Indicator Ring on Voice Channel Avatars

### Overview
Add a glowing green (#00db21) ring around the avatar of any participant who is currently speaking in a voice channel, matching Discord's visual style.

### How It Works
Use the Web Audio API (`AudioContext` + `AnalyserNode`) to detect audio volume levels from both the local microphone stream and remote peer streams. When the volume exceeds a threshold, mark that user as "speaking" and render a colored ring around their avatar.

### Changes

**`src/components/server/VoiceConnectionBar.tsx`**
- Add a `speakingUsers` state (`Set<string>`) tracking which user IDs are currently speaking
- For the **local user**: create an `AudioContext` and `AnalyserNode` connected to `localStreamRef.current`. Use a `requestAnimationFrame` loop to check volume levels. When above threshold, add current user ID to `speakingUsers`; when below, remove it
- For **remote users**: in the `createPeerConnection` callback, when `pc.ontrack` fires, attach an `AnalyserNode` to the remote stream and monitor volume the same way, keying on the peer's user ID
- Clean up all `AudioContext` instances and animation frame loops on unmount/disconnect
- In the avatar render section, conditionally apply a ring style: `ring-2` with custom color `#00db21` when the user is in the `speakingUsers` set

**`src/components/server/ChannelSidebar.tsx`**
- The sidebar also shows participant avatars under voice channels (lines 405-414)
- To keep it simple, use Supabase Realtime broadcast to share speaking state: each client broadcasts `voice-speaking` events with `{ userId, isSpeaking }` on the existing voice signal channel
- The `ChannelSidebar` subscribes to these broadcasts and maintains a `speakingUsers` set
- Apply the same green ring styling to avatars of speaking users in the sidebar

### Styling
The ring will use inline style or a Tailwind arbitrary value for the exact color:
```
ring-2 ring-[#00db21]
```
with a smooth transition so the ring fades in/out:
```
transition-shadow duration-150
```

### Technical Details

**Volume Detection (AudioContext approach):**
```typescript
const audioCtx = new AudioContext();
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 256;
const source = audioCtx.createMediaStreamSource(stream);
source.connect(analyser);

const dataArray = new Uint8Array(analyser.frequencyBinCount);
const checkVolume = () => {
  analyser.getByteFrequencyData(dataArray);
  const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
  const isSpeaking = avg > 15; // threshold
  // update speakingUsers set accordingly
  rafId = requestAnimationFrame(checkVolume);
};
checkVolume();
```

**Broadcasting speaking state** (so sidebar can show it too):
```typescript
channelRef.current?.send({
  type: "broadcast",
  event: "voice-speaking",
  payload: { userId: user.id, isSpeaking: true }
});
```

**Avatar ring in both components:**
```tsx
<Avatar className={`h-5 w-5 ${speakingUsers.has(p.user_id) ? "ring-2 ring-[#00db21]" : ""} transition-all duration-150`}>
```

### Files Modified
- `src/components/server/VoiceConnectionBar.tsx` -- audio analysis + speaking state + ring on avatars
- `src/components/server/ChannelSidebar.tsx` -- subscribe to speaking broadcasts + ring on sidebar avatars

