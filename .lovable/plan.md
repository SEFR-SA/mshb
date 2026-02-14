

## Limit Channel Name to 17 Characters

### What This Does
Prevents users from entering more than 17 characters when creating a text or voice channel name. The input field will be capped at 17 characters, and the create button will be disabled if the limit is exceeded.

### Changes

**`src/components/server/ChannelSidebar.tsx`**

1. Add `maxLength={17}` to the channel name `<Input>` element (line 539-543) to prevent typing beyond 17 characters
2. Update the `handleCreateChannel` function (line 180-181) to also reject names longer than 17 characters as a safety check
3. Add a small helper text below the input showing the character count (e.g., "5/17") so users know how many characters remain

### Files Modified
- `src/components/server/ChannelSidebar.tsx` -- add maxLength constraint and character counter to channel name input

