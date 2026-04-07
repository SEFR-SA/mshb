

## Fix Plan: Build Error + Voice Channel Bugs

### Root Cause

The `livekit-token` edge function has **4 TypeScript errors** (TS2739) that prevent it from deploying. The Supabase JS client's `.then()` returns `PromiseLike`, not a full `Promise`. Without a working token endpoint, users cannot connect to LiveKit rooms at all — which explains both the missing speaking indicators and the missing audio.

The speaking indicator logic (`ActiveSpeakersChanged` → DB write → realtime refetch) and audio attachment logic (`TrackSubscribed` → `track.attach()`) in `useLiveKitRoom.ts` and `VoiceConnectionBar.tsx` are **already correctly implemented**. They just never execute because the connection fails at the token stage.

### Fix: `supabase/functions/livekit-token/index.ts`

Wrap each of the 4 reassigned promises in `Promise.resolve(...)` to coerce `PromiseLike` into a proper `Promise`:

**Line 83** — `boostPromise`:
```typescript
boostPromise = Promise.resolve(supabase
  .from("channels")
  .select("server_id")
  ...
  .then(...));
```

**Lines 99, 107, 115** — `connectPromise`, `speakPromise`, `videoPromise`:
```typescript
connectPromise = Promise.resolve(serviceClient
  .rpc(...)
  .then(({ data }) => data ?? true));
```

Same pattern for all three. This is a one-line wrapper on each assignment — no logic changes.

### Files Modified
- `supabase/functions/livekit-token/index.ts` — wrap 4 promise assignments in `Promise.resolve()`

### What This Does NOT Touch
- No changes to `useLiveKitRoom.ts`, `VoiceConnectionBar.tsx`, `ChannelSidebar.tsx`, or any other file
- No changes to connection parameters, token generation logic, or architecture

