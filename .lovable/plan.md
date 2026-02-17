

## Plan

### 1. Update PWA Icons
Copy the new favicon image to `public/icon-192.png` and `public/icon-512.png` so the PWA icons match the new favicon.

### 2. Dynamic Font-Weight for Text Channels
Update the text channel rendering in `ChannelSidebar.tsx` (around line 676-683). The existing `unreadSet` hook already tracks unread state. Change the styling to:
- **Unread**: `font-bold text-white` (font-weight 700, bright white)
- **Read/normal**: `font-medium text-[#949BA4]` (font-weight 500, muted Discord-style gray)
- **Hover on muted**: `hover:text-[#DBDEE1]` (slightly brighter on hover, matching Discord)
- **Active channel**: keep existing active styling with bold weight

### 3. Dynamic Font-Weight for Voice Channels
Update the voice channel button (around line 622-628). The existing `voiceParticipants` map already tracks participants per channel. Change styling to:
- **Has participants**: `font-bold text-white` (font-weight 700, bright)
- **Empty**: `font-medium text-[#949BA4]` (font-weight 500, muted)
- **Hover on muted**: `hover:text-[#DBDEE1]`

### Technical Details

**Files modified:**
- `public/icon-192.png` -- copied from new favicon
- `public/icon-512.png` -- copied from new favicon
- `src/components/server/ChannelSidebar.tsx` -- update className logic on lines ~622-628 (voice) and ~676-683 (text)

No database changes needed -- the existing `useChannelUnread` hook and `voiceParticipants` state already provide the required data via realtime subscriptions.

