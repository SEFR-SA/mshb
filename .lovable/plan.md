

## Fix Sticker Picker Content Area Being Cut Off

### Problem
The GIPHY stickers tab content is cut off because the Radix `TabsContent` component does not stretch to fill the available flex space. Even though `flex-1 flex flex-col min-h-0` classes are applied, the Radix `TabsContent` only becomes visible (not hidden) when active -- it does not participate in flex layout properly because it lacks `display: flex` in its active state internally.

### Solution
Override the `TabsContent` styling specifically in the `StickerPicker` to ensure the active tab content stretches properly. Add `data-[state=active]:flex` to the `TabsContent` className so that when the tab is active, it uses flex display and the `flex-1` class can take effect.

### Changes

**`src/components/chat/StickerPicker.tsx`**
- Line 147: Change the GIPHY `TabsContent` className from:
  `"flex-1 flex flex-col min-h-0 mt-0"`
  to:
  `"flex-1 flex flex-col min-h-0 mt-0 data-[state=active]:flex"`

- Line 202: Apply the same fix to the custom stickers `TabsContent`:
  `"flex-1 flex flex-col min-h-0 mt-0 data-[state=active]:flex"`

**`src/components/chat/GifPicker.tsx`**
- Apply the same fix to the GIF picker's content container to prevent the same issue there. The outer `div` wrapping the content should also use proper flex sizing.

### Why This Works
Radix UI's `TabsContent` toggles between `display: none` (inactive) and its default display (active). Since `div` elements default to `display: block`, the `flex` and `flex-1` classes have no effect. By adding `data-[state=active]:flex`, we ensure the element uses flexbox layout when visible, allowing `flex-1` to stretch it to fill the parent.

