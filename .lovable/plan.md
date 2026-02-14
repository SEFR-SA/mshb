

## Remove Custom Sticker Upload -- GIPHY Stickers Only

### Overview
Simplify the Sticker picker by removing the "My Stickers" tab and all custom upload functionality. The picker will only show GIPHY stickers.

### Changes

**`src/components/chat/StickerPicker.tsx`**
- Remove imports: `Upload`, `Trash2`, `useAuth`, `toast`, `fileInputRef`
- Remove all state/logic for custom stickers: `customStickers`, `fetchCustomStickers`, `handleUpload`, `handleDeleteCustom`, `fileInputRef`
- Remove the `Tabs`/`TabsList`/`TabsTrigger` wrapper -- no need for tabs with only one source
- Keep only the GIPHY sticker content (search bar, categories, sticker grid)
- Simplify the `useEffect` to only fetch GIPHY stickers

**Result**: A clean, single-panel sticker picker that shows GIPHY stickers with search and category browsing -- no tabs, no upload button, no custom sticker management.

