

## "Active Now" Panel on Friends Page

### What This Does
Adds a right-side panel to the Friends page (matching the Discord screenshot) that shows which of your accepted friends are currently in a voice channel. Each entry displays the friend's avatar, name, the server name, and the voice channel name. Clicking the voice channel navigates to that server and triggers joining the voice channel.

---

### Changes

#### 1. New Component: `src/components/chat/ActiveNowPanel.tsx`

A self-contained panel component that:
- Takes the list of accepted friend user IDs as a prop
- Queries `voice_channel_participants` to find which friends are currently in voice channels
- Joins with `channels` (to get channel name + server_id) and `servers` (to get server name + icon)
- Joins with `profiles` (to get friend avatar/display_name)
- Subscribes to realtime changes on `voice_channel_participants` for live updates
- Renders each active friend as a card showing:
  - Friend's avatar + display name
  - Server icon + server name
  - Voice channel name (clickable, navigates to `/server/:serverId` with the voice channel)
- Shows "No one is active right now" when empty

#### 2. Update `src/pages/Friends.tsx`

- Import and render `ActiveNowPanel` in a two-column flex layout:
  - Left (flex-1): existing friends content (tabs, lists)
  - Right (fixed ~280px width): the Active Now panel
- Pass the list of accepted friend user IDs to the panel
- On mobile, hide the panel (hidden on small screens)

#### 3. Translations

**`src/i18n/en.ts`**
- `friends.activeNow` -- "Active Now"
- `friends.noActiveNow` -- "No one is active right now"

**`src/i18n/ar.ts`**
- Arabic equivalents

---

### Technical Details

**Query to find active friends in voice channels:**
```text
1. Get friend user IDs from the accepted friendships list (already available in Friends.tsx)
2. Query voice_channel_participants WHERE user_id IN (friendUserIds)
3. For each participant, fetch the channel (name, server_id) and server (name, icon_url)
4. For each participant, use the profile already loaded or fetch from profiles
```

**Navigation on voice channel click:**
Navigates to `/server/:serverId` -- the ServerView component will handle showing the server. The channel ID can be passed as a query param or state so the user lands on that voice channel context.

**Layout change in Friends.tsx:**
```text
<div className="flex h-full">
  <div className="flex-1 flex flex-col overflow-hidden">
    {/* existing tabs and content */}
  </div>
  <div className="hidden lg:block w-[280px] border-s">
    <ActiveNowPanel friendUserIds={[...]} />
  </div>
</div>
```

**Realtime subscription:**
Subscribe to `voice_channel_participants` changes to refresh the active list when friends join or leave voice channels.

### Files Modified
- **New**: `src/components/chat/ActiveNowPanel.tsx` -- the Active Now panel component
- `src/pages/Friends.tsx` -- add two-column layout with the panel
- `src/i18n/en.ts` -- new translation keys
- `src/i18n/ar.ts` -- Arabic translations
