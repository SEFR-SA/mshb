

# LiveKit Migration — Full Technical Plan

## Scope

Replace all P2P WebRTC code (server voice channels AND DM calls) with LiveKit SFU. This is a large migration spanning ~8 phases.

## Current Architecture (What We're Replacing)

| Component | Role |
|---|---|
| `src/hooks/useWebRTC.ts` (638 lines) | P2P WebRTC for DM 1-to-1 calls |
| `src/components/server/VoiceConnectionBar.tsx` (798 lines) | P2P mesh WebRTC for server voice channels |
| `src/components/chat/CallListener.tsx` | Incoming call handler (uses `useWebRTC`) |
| `src/pages/Chat.tsx` | DM chat page (uses `useWebRTC` for in-chat calls) |
| `src/components/chat/VoiceCallUI.tsx` | Call overlay UI (imports `CallState` from `useWebRTC`) |
| `src/contexts/VoiceChannelContext.tsx` | Shared voice state (streams, screen share, camera) |
| `src/components/GoLiveModal.tsx` | Pre-stream quality selection UI (keeps mostly as-is) |
| Supabase Realtime channels | Signaling (offers, answers, ICE candidates) — replaced by LiveKit |
| `voice_channel_participants` table | Presence tracking — kept, but simplified |
| `call_sessions` table | DM call signaling/state — kept for call lifecycle |

## Prerequisites (What You Need To Do Now)

- [ ] Create a LiveKit Cloud account at https://cloud.livekit.io
- [ ] Provide three secrets via the Lovable secrets tool:
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`
  - `LIVEKIT_WS_URL` (e.g. `wss://your-app.livekit.cloud`)

## Phase 1: Secrets + Token Edge Function

**Goal**: Secure backend token generation.

**New file**: `supabase/functions/livekit-token/index.ts`

- Accepts `{ roomName, participantName, participantIdentity, metadata? }`
- Authenticates caller via `getClaims()`
- Queries `profiles.is_pro` and (for server rooms) the server's `boost_level`
- Generates a LiveKit `AccessToken` using `livekit-server-sdk` with:
  - `canPublish: true`, `canSubscribe: true`, `canPublishData: true`
  - Metadata JSON: `{ isPro, boostLevel, userId }`
- Returns `{ token, wsUrl }` to the client
- Add to `supabase/config.toml`: `[functions.livekit-token] verify_jwt = false`

**New file**: `src/lib/livekit.ts`
- Helper to call the edge function and return `{ token, wsUrl }`
- Room name conventions: `server-voice:{channelId}` for voice channels, `dm-call:{sessionId}` for DM calls

## Phase 2: Install LiveKit SDK + New Hook

**Install**: `@livekit/components-react`, `livekit-client`

**New file**: `src/hooks/useLiveKitRoom.ts`
- Wraps `livekit-client`'s `Room` class
- Manages: connect/disconnect, local mic track, mute/deafen state, call duration timer
- Exposes: `participants`, `isMuted`, `isDeafened`, `toggleMute`, `toggleDeafen`, `callState`
- Handles `RoomEvent.TrackSubscribed` / `TrackUnsubscribed` for remote tracks
- Speaking detection via `RoomEvent.ActiveSpeakersChanged` (replaces the manual AnalyserNode volume monitor)
- Per-user volume control via `RemoteTrackPublication.setVolume()`

## Phase 3: Server Voice Channels — Replace VoiceConnectionBar

**Replace**: `src/components/server/VoiceConnectionBar.tsx`

The new `VoiceConnectionManager` will:
1. Request a token from the edge function with `roomName = server-voice:{channelId}`
2. Connect to LiveKit room via `useLiveKitRoom`
3. Publish local mic track (respecting `globalMuted`)
4. Subscribe to all remote participants' audio tracks automatically (SFU handles routing)
5. Keep `voice_channel_participants` DB inserts/deletes for sidebar presence display
6. Keep AFK timer logic, entrance sound broadcasts, soundboard via LiveKit DataChannel
7. Speaking state updates via `ActiveSpeakersChanged` event instead of AnalyserNode

**Key simplification**: No more `peerConnectionsRef`, `createPeerConnection()`, offer/answer/ICE handling, `onnegotiationneeded`. All gone — LiveKit handles it.

## Phase 4: Screen Sharing via LiveKit

**Modify**: `VoiceConnectionManager` + keep `GoLiveModal.tsx` as-is

- Screen share = publish a second track via `room.localParticipant.setScreenShareEnabled(true, captureOpts)`
- `captureOpts` built from `GoLiveSettings` (resolution, fps, sourceId for Electron)
- Tier enforcement in the token metadata: edge function embeds `isPro` → client reads it to cap publish options
- Free users: `maxFramerate: 30, width: 1920, height: 1080` max
- Pro users: up to source quality / 4K / 60fps
- Multiple simultaneous screen shares: LiveKit natively supports this — each participant's screen share is a separate track, subscribers receive all of them
- Grid view for multiple streams: new UI component to render a grid of `<VideoTrack>` components

**Electron handling**: Use `desktopCapturer` source from `GoLiveModal` → pass `sourceId` to LiveKit's `createScreenShareTrack` with `chromeMediaSource: 'desktop'`

## Phase 5: Camera via LiveKit

- Camera = `room.localParticipant.setCameraEnabled(true)`
- Publish options: `{ resolution: VideoPresets.h1080, facingMode: 'user' }`
- Self-view: render `localParticipant`'s camera track
- Remote camera: subscribe to remote participants' camera tracks

## Phase 6: DM Calls — Replace useWebRTC

**Replace**: `src/hooks/useWebRTC.ts` → rewrite to use LiveKit

The new `useWebRTC` (or renamed `useLiveKitCall`) will:
1. On `startCall`: request token with `roomName = dm-call:{sessionId}`, connect
2. On `answerCall`: request token with same room name, connect
3. Keep the `call_sessions` DB table for call lifecycle (ringing → connected → ended)
4. Keep Supabase Realtime for call signaling metadata (who's calling whom) — NOT for WebRTC signaling
5. Screen share + camera in DM calls: same LiveKit track publishing as server voice

**`CallListener.tsx`**: Update imports from `useWebRTC` to new hook. Call flow (incoming detection, accept/decline, timeout) stays the same — only the media transport changes.

**`Chat.tsx`**: Same — swap `useWebRTC` import.

**`VoiceCallUI.tsx`**: Update `CallState` import. The UI component itself barely changes — it receives streams as props.

## Phase 7: Audio Bitrate from Server Boost Level

- Token metadata includes `boostLevel` (0-3)
- On room connect, client reads metadata and sets audio publish options:
  - Level 0: 96 kbps (default)
  - Level 1: 128 kbps
  - Level 2: 256 kbps
  - Level 3: 384 kbps
- Uses `room.localParticipant.setMicrophoneEnabled(true, { audioBitrate })` or `track.setPublishOptions()`
- Aligns with existing `src/config/boostPerks.ts` `audioQualityKbps` values

## Phase 8: Cleanup

- Delete old P2P signaling code (Supabase Realtime `call-{sid}`, `voice-signal-{channelId}` channels)
- Remove `optimizeSDPForGaming()`, ICE candidate queues, all `RTCPeerConnection` code
- Remove `createVolumeMonitor()` from VoiceConnectionBar (LiveKit provides speaking detection)
- Simplify `VoiceChannelContext` — remove raw `MediaStream` state where LiveKit components handle rendering
- Clean up unused refs (`pcRef`, `screenSenderRef`, `cameraSenderRef`, etc.)

## Files Summary

| Action | File |
|---|---|
| **Create** | `supabase/functions/livekit-token/index.ts` |
| **Create** | `src/lib/livekit.ts` |
| **Create** | `src/hooks/useLiveKitRoom.ts` |
| **Rewrite** | `src/components/server/VoiceConnectionBar.tsx` |
| **Rewrite** | `src/hooks/useWebRTC.ts` (→ LiveKit-based) |
| **Update** | `src/components/chat/CallListener.tsx` |
| **Update** | `src/pages/Chat.tsx` |
| **Update** | `src/components/chat/VoiceCallUI.tsx` |
| **Update** | `src/contexts/VoiceChannelContext.tsx` |
| **Update** | `src/components/server/ChannelSidebar.tsx` (screen share UI) |
| **Keep** | `src/components/GoLiveModal.tsx` (minor integration changes) |
| **Update** | `supabase/config.toml` (add livekit-token function) |

## Execution Order

We will implement this in order: Phase 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8, with each phase being a working checkpoint. Phase 1 starts as soon as you provide the three LiveKit secrets.

