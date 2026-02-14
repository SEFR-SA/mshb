

## Big Emoji Display for Emoji-Only Messages

### Overview
When a message contains only emojis (no text), display the emojis at a larger size -- similar to Discord's behavior. Messages with up to 30 emojis will render large; messages exceeding 30 emojis revert to normal size.

### Approach
Create a shared utility function `isEmojiOnly(text)` that checks if a string contains only emoji characters (and whitespace). Then, in the message rendering, apply a larger text size class when the condition is met and the emoji count is 30 or fewer.

### Changes

**New: `src/lib/emojiUtils.ts`**
- `isEmojiOnly(text: string): boolean` -- returns true if the string contains only emoji characters and optional whitespace
- `countEmojis(text: string): number` -- counts the number of emoji characters
- `getEmojiClass(text: string): string` -- returns a CSS class: `"text-4xl"` for emoji-only messages with 30 or fewer emojis, or `""` otherwise

**Modified: `src/pages/Chat.tsx`** (line ~452)
- Import `getEmojiClass` from `@/lib/emojiUtils`
- Change the `<p>` tag rendering `msg.content` to conditionally apply the large emoji class:
  ```
  <p className={`whitespace-pre-wrap break-words ${getEmojiClass(msg.content) || 'text-sm'}`}>
  ```

**Modified: `src/pages/GroupChat.tsx`** (line ~386)
- Same change as Chat.tsx -- import and apply `getEmojiClass`

**Modified: `src/components/server/ServerChannelChat.tsx`** (line ~270)
- Same change -- apply `getEmojiClass` to the message content paragraph

### Technical Details

The emoji detection regex will use a Unicode property escape (`/\p{Emoji}/u`) to match emoji characters. The logic:

1. Strip all whitespace from the message
2. Check if every character/grapheme is an emoji
3. Count total emojis
4. If emoji-only AND count is 30 or fewer, return `"text-4xl leading-relaxed"` for large display
5. Otherwise return empty string, falling back to `"text-sm"`

This approach handles:
- Single emojis (very large)
- Multiple emojis up to 30 (large)
- 31+ emojis (normal small size)
- Mixed text + emoji (normal small size)
- Deleted messages are excluded since the check only runs on non-deleted content
