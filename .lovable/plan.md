

## Event Lifecycle Actions & Server Rail Indicator

### Phase 1: Event Actions Dropdown on EventCard

**File: `src/components/server/events/EventCard.tsx`**

- Add `creator_id` to the event interface and new props: `isAdmin`, `currentUserId`, `onStartEvent`, `onEditEvent`, `onCancelEvent`.
- Add a `MoreHorizontal` icon button to the right of the "Interested" button that opens a `<DropdownMenu>`.
- Menu items:
  - "Start Event" — visible only to creator/admin, only when `status === 'scheduled'`
  - "Edit Event" — visible only to creator/admin
  - "Cancel Event" — visible only to creator/admin, styled `text-red-500`
  - "Report Event" — visible to everyone, styled `text-red-500`
- All items use `e.stopPropagation()` to prevent card click.

**File: `src/components/server/events/EventBrowserModal.tsx`**

- Pass `creator_id` through the event data mapping (it's already in `rawEvents`).
- Pass `isAdmin`, `currentUserId`, and handler callbacks (`onStartEvent`, `onCancelEvent`) down to `EventCard`.
- `onStartEvent`: show confirmation dialog, then update `server_events.status` to `'active'`. If voice event, call `setVoiceChannel` from `VoiceChannelContext`.
- `onCancelEvent`: update status to `'cancelled'`, optimistically remove from list.
- Add a confirmation `AlertDialog` for Start and Cancel actions.

### Phase 2: Time-Gated "Start" Button

**In `EventCard.tsx`:**

- Compute `canStart`: `status === 'scheduled'` AND `(startTime - now) <= 15 minutes` AND user is creator/admin.
- Use a single `setInterval(60_000)` inside the card to re-evaluate `Date.now()` every 60 seconds (stored in state as a `tick` counter). This avoids infinite re-renders — it's just one interval per card that bumps a number, causing a cheap re-render once per minute. When the card unmounts, the interval clears.
- When `canStart` is true, render a primary "Start" `<Button>` between "Interested" and the dots menu.
- Clicking it calls the same `onStartEvent` handler.

### Phase 3: Server Rail Active Event Indicator

**New hook: `src/hooks/useServerActiveEvents.ts`**

- Accepts `serverIds: string[]`.
- Queries `server_events` where `status = 'active'` and `server_id in serverIds`.
- Returns `Set<string>` of server IDs that have active events.
- Subscribes to `postgres_changes` on `server_events` table for real-time updates — same pattern as `useServerVoiceActivity`.

**File: `src/components/server/ServerRail.tsx`**

- Import the new hook, call it with `serverIds`.
- In the server avatar render (both loose servers around line 481 and inside `ServerFolder`), if the server has an active event AND does not already show a voice/screen indicator, render a small `Calendar` icon badge at bottom-right (same styling as the voice badge but with a purple/blue background instead of green).

**File: `src/components/server/ServerFolder.tsx`**

- Accept `activeEventSet` prop and forward it to individual server items within the folder.

### Voice Channel Auto-Join on Start

When `onStartEvent` fires for a voice event with `channel_id`:
1. Fetch the channel name from `channels` table.
2. Call `setVoiceChannel({ id: channelId, name, serverId })` from `useVoiceChannel()` context.
3. Navigate to the server/channel route.

### Files Changed

| File | Action |
|------|--------|
| `src/components/server/events/EventCard.tsx` | Add dropdown, start button, tick interval |
| `src/components/server/events/EventBrowserModal.tsx` | Pass new props, add start/cancel handlers + confirmation dialogs |
| `src/hooks/useServerActiveEvents.ts` | Create — realtime active event detection |
| `src/components/server/ServerRail.tsx` | Add active event badge |
| `src/components/server/ServerFolder.tsx` | Forward active event set to server items |

### What stays untouched
- `CreateEventModal.tsx`, `ImageCropEditor.tsx`, date-time-picker — no changes
- Date/time validation, frequency logic — untouched
- Database schema — no migrations needed (status column already supports 'active'/'cancelled')

