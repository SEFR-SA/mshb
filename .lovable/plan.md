

## Fix Sticker Picker Layout and Remove "Powered by GIPHY" Text

### Problem
The "Powered by GIPHY" footer in the Sticker picker's GIPHY tab takes up space and obscures the sticker grid. The user wants it removed entirely.

### Changes

**`src/components/chat/StickerPicker.tsx`**
- Remove lines 200-202 (the "Powered by GIPHY" footer div from the GIPHY tab)

**`src/components/chat/GifPicker.tsx`**
- Remove lines 120-122 (the "Powered by GIPHY" footer div from the GIF picker)

This removes the footer from both pickers, giving the sticker/GIF grids full available height within the 400px popover.

### Technical Details

| File | Lines to Remove | Description |
|------|----------------|-------------|
| `src/components/chat/StickerPicker.tsx` | Lines 200-202 | Remove `<div className="p-1 border-t...">` containing "Powered by GIPHY" |
| `src/components/chat/GifPicker.tsx` | Lines 120-122 | Remove `<div className="p-1 border-t...">` containing "Powered by GIPHY" |

