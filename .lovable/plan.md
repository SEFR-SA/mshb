

## Add GIF and Sticker Pickers to All Chat Areas

### Overview
Add two new buttons next to the existing emoji picker (in DM chat, group chat, and server channel chat) for browsing/searching GIFs and stickers powered by the GIPHY API. Users can also upload their own custom stickers. Both GIFs and stickers are categorized for easy browsing.

### GIPHY API Key Setup
Your GIPHY API key will be stored securely as a backend secret. Since the GIPHY API requires a key, we'll create a small backend function that proxies requests to GIPHY so the key stays private.

### Architecture

**New Edge Function: `giphy-proxy`**
- Proxies search/trending/categories requests to GIPHY's API (for both GIFs and stickers)
- Keeps the API key server-side (secure)
- Endpoints:
  - `GET /giphy-proxy?type=gifs&q=funny` -- search GIFs
  - `GET /giphy-proxy?type=stickers&q=hello` -- search GIPHY stickers
  - `GET /giphy-proxy?type=gifs&trending=true` -- trending GIFs
  - `GET /giphy-proxy?type=stickers&trending=true` -- trending stickers

**New Database Table: `custom_stickers`**
- `id` (uuid, PK)
- `user_id` (uuid, references profiles)
- `name` (text)
- `image_url` (text) -- stored in a new `stickers` storage bucket
- `category` (text, default 'custom')
- `created_at` (timestamp)
- RLS: users can CRUD their own stickers, all authenticated users can view all stickers

**New Storage Bucket: `stickers`**
- Public bucket for user-uploaded sticker images
- RLS: authenticated users can upload to their own folder, anyone can view

**New Components:**

| Component | Purpose |
|-----------|---------|
| `src/components/chat/GifPicker.tsx` | Popover with search, categories (trending, reactions, actions, etc.), and a masonry-style grid of GIF results from GIPHY |
| `src/components/chat/StickerPicker.tsx` | Popover with tabs: "GIPHY Stickers" and "My Stickers". GIPHY tab has search/categories. My Stickers tab shows uploaded stickers with an upload button |

### How GIFs and Stickers Are Sent
When a user selects a GIF or sticker, it is sent as a message with:
- `content` set to the GIF/sticker URL
- `file_type` set to `"gif"` or `"sticker"` to differentiate rendering
- `file_url` set to the image URL

This reuses the existing message schema -- no new columns needed. The chat rendering logic will detect `file_type === "gif"` or `"sticker"` and display the image inline without the usual file attachment UI.

### Categories
**GIF Categories** (from GIPHY's API): Trending, Reactions, Entertainment, Sports, Actions, Memes
**Sticker Categories** (from GIPHY's API): Trending, Greetings, Love, Celebrations, Reactions
**Custom Stickers**: User's own uploaded stickers in a separate "My Stickers" tab

### Integration Points
The GIF and Sticker picker buttons will be added in these 3 locations:
1. `src/pages/Chat.tsx` -- DM composer (line ~520, next to EmojiPicker)
2. `src/pages/GroupChat.tsx` -- Group composer (line ~452, next to FileAttachmentButton -- note: GroupChat currently lacks EmojiPicker, so we'll add all three)
3. `src/components/server/ServerChannelChat.tsx` -- Server channel composer (line ~293, next to EmojiPicker)

### Message Rendering Updates
Update the message rendering in all three chat views to detect `file_type === "gif"` or `file_type === "sticker"` and render the image inline (auto-playing for GIFs, static for stickers) instead of showing the file attachment card.

### Translation Keys
Add new keys to `en.ts` and `ar.ts`:
- `gif.search`, `gif.trending`, `gif.title`, `gif.poweredBy`
- `sticker.search`, `sticker.trending`, `sticker.title`, `sticker.myStickers`, `sticker.upload`, `sticker.delete`, `sticker.uploadSuccess`, `sticker.deleteSuccess`

### Files Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/giphy-proxy/index.ts` | Create | Edge function to proxy GIPHY API requests |
| `src/components/chat/GifPicker.tsx` | Create | GIF picker with search and categories |
| `src/components/chat/StickerPicker.tsx` | Create | Sticker picker with GIPHY stickers + custom upload |
| `src/pages/Chat.tsx` | Modify | Add GIF and Sticker buttons to DM composer, update message rendering |
| `src/pages/GroupChat.tsx` | Modify | Add Emoji, GIF, and Sticker buttons to group composer, update message rendering |
| `src/components/server/ServerChannelChat.tsx` | Modify | Add GIF and Sticker buttons to server composer, update message rendering |
| `src/i18n/en.ts` | Modify | Add GIF/sticker translation keys |
| `src/i18n/ar.ts` | Modify | Add Arabic GIF/sticker translations |
| DB Migration | Create | `custom_stickers` table, `stickers` storage bucket, RLS policies |

