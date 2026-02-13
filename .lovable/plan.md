

## Enhanced Image Viewer with Toolbar

### Overview
Replace the current simple fullscreen image overlay in `MessageFilePreview.tsx` with a rich image viewer that includes a Discord-style top toolbar and a "View Details" panel. The toolbar and interactions will match the reference image provided.

### UI Design

**Top toolbar** (horizontal bar centered at the top of the fullscreen overlay, dark rounded pill):
- **Zoom In** (magnifying glass +) -- zooms in on the image
- **Zoom Out** (magnifying glass -) -- zooms out on the image
- **Forward** (share/forward icon) -- opens a dialog to pick a user/group to forward the image to
- **Save/Download** (download icon) -- downloads the image file
- **Copy Image** (copy icon) -- copies the image to clipboard
- **More (...)** menu with "View Details" option -- shows filename + size in a popover/panel
- **Close (X)** button at the far right

**View Details panel** (small card overlay, bottom-left or near the image):
- Filename
- File size (formatted)

### Components

**1. New: `src/components/chat/ImageViewer.tsx`**
- Full-screen overlay component with dark backdrop
- Manages zoom state (scale transform on the image, min 0.5x, max 3x)
- Top toolbar with icon buttons styled as a dark pill bar
- Forward button opens a `ForwardImageDialog`
- Save button triggers file download via anchor element
- Copy Image button uses `navigator.clipboard` / canvas approach to copy image to clipboard
- View Details toggle shows/hides a small info card with filename and size
- Close button and click-outside-image to close
- Keyboard support: Escape to close, +/- for zoom

**2. New: `src/components/chat/ForwardImageDialog.tsx`**
- A dialog listing the user's DM threads and group threads
- User selects a recipient and confirms
- Inserts a new message with the same `file_url`, `file_name`, `file_type`, `file_size` into the chosen thread
- Shows a success toast on completion

**3. Modify: `src/components/chat/MessageFilePreview.tsx`**
- Replace the inline fullscreen overlay with `<ImageViewer>` component
- Pass `fileUrl`, `fileName`, `fileType`, `fileSize` to it

**4. Modify: `src/i18n/en.ts` and `src/i18n/ar.ts`**
- Add strings for: `imageViewer.zoomIn`, `imageViewer.zoomOut`, `imageViewer.forward`, `imageViewer.save`, `imageViewer.copyImage`, `imageViewer.viewDetails`, `imageViewer.filename`, `imageViewer.size`, `imageViewer.copiedToClipboard`, `imageViewer.forwarded`

### Technical Details

**Zoom**: CSS `transform: scale(zoomLevel)` on the image, with scroll-wheel zoom support.

**Copy Image**: Fetch the image as a blob, then use `navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])`. Fall back to a toast error if clipboard API is not available.

**Save/Download**: Create a temporary `<a>` element with `download` attribute pointing to the file URL.

**Forward**: Query `dm_threads` and `group_threads` for the current user, display them in a list dialog, and insert a message with the file metadata into the selected thread.

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/chat/ImageViewer.tsx` | **Create** -- fullscreen viewer with toolbar |
| `src/components/chat/ForwardImageDialog.tsx` | **Create** -- recipient picker for forwarding |
| `src/components/chat/MessageFilePreview.tsx` | **Modify** -- use ImageViewer instead of inline overlay |
| `src/i18n/en.ts` | **Modify** -- add image viewer strings |
| `src/i18n/ar.ts` | **Modify** -- add Arabic translations |

