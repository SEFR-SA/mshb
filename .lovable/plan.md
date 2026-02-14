

## 1. Simplify VoiceConnectionBar

Remove the local mute and deafen buttons from `VoiceConnectionBar` since they are now redundant (universal buttons exist in the sidebar). Move the disconnect (hang up) button to sit right next to the voice channel name for a cleaner, compact layout.

**Modified: `src/components/server/VoiceConnectionBar.tsx`**
- Remove the `toggleMute`, `toggleDeafen` functions and their associated state syncing with global context
- Remove `isMuted`, `isDeafened` local state (no longer needed for UI)
- Keep WebRTC logic, participant display, and `leaveVoice`
- New layout: `[green dot] [speaker icon] channelName [avatars] [PhoneOff button]` -- all in one row, disconnect button right after the name/avatars
- Remove unused imports (`Mic`, `MicOff`, `HeadphoneOff`)

## 2. Add Emoji Picker to All Chat Inputs

Add a smiley face button next to the text input in both server text channels and 1-to-1 DMs. Clicking it opens a popover with categorized emoji grid (similar to Discord).

**New Component: `src/components/chat/EmojiPicker.tsx`**
- A button (Smile icon from lucide) that opens a Popover
- Inside the popover: category tabs (Smileys, People, Animals, Food, Travel, Objects, Symbols, Flags) using horizontal scrollable tab buttons
- Each category shows a grid of native Unicode emojis
- Clicking an emoji calls `onEmojiSelect(emoji: string)` callback and closes the popover
- Optional search/filter input at the top to filter emojis by name
- Compact design: roughly 300px wide, 350px tall popover
- Uses Radix Popover component already in the project

**Modified: `src/components/server/ServerChannelChat.tsx`**
- Import and add `EmojiPicker` in the composer bar, between the file attachment button and the text input
- On emoji select, insert the emoji at the current cursor position in the input and refocus

**Modified: `src/pages/Chat.tsx`**
- Same change: add `EmojiPicker` in the composer bar between file attachment and input
- On emoji select, append/insert emoji into the message input

**Modified: `src/i18n/en.ts` and `src/i18n/ar.ts`**
- Add translation keys for emoji picker: `emoji.search`, `emoji.categories.*` (smileys, people, animals, food, travel, objects, symbols, flags)

### Technical Details

**EmojiPicker component structure:**
```typescript
interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}
```

- Uses a static data structure of categorized emojis (no external dependency needed -- native Unicode emojis)
- Each category is an object: `{ name: string, translationKey: string, emojis: string[] }`
- Around 50-80 popular emojis per category for performance
- Search filters across all categories by emoji name/keyword
- Grid layout: `grid-cols-8` with each emoji as a clickable button

**Emoji insertion logic (for both chats):**
```typescript
const handleEmojiSelect = (emoji: string) => {
  setNewMsg((prev) => prev + emoji);
  inputRef.current?.focus();
};
```

### Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/server/VoiceConnectionBar.tsx` | Modify | Remove mute/deafen buttons; place disconnect next to channel name |
| `src/components/chat/EmojiPicker.tsx` | Create | Emoji picker popover component with categories and search |
| `src/components/server/ServerChannelChat.tsx` | Modify | Add EmojiPicker button in composer |
| `src/pages/Chat.tsx` | Modify | Add EmojiPicker button in composer |
| `src/i18n/en.ts` | Modify | Add emoji-related translation keys |
| `src/i18n/ar.ts` | Modify | Add Arabic emoji translations |

