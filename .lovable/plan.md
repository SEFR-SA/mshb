

## Event Cover Image Cropper — Implementation Plan

### Approach

Create a new `ImageCropEditor` component file and integrate it into the existing cover image flow. No third-party packages — the pan/zoom/canvas math is straightforward for a fixed-aspect-ratio banner crop.

### New file: `src/components/server/events/ImageCropEditor.tsx`

A self-contained component that receives a raw image URL and returns a cropped `File` on "Apply".

**Props:**
```typescript
interface ImageCropEditorProps {
  imageUrl: string;
  onApply: (croppedFile: File) => void;
  onCancel: () => void;
}
```

**Internal state:**
- `zoom: number` — range 1.0 to 3.0, controlled by `<Slider />`
- `position: { x: number, y: number }` — pixel offset from center, updated by drag
- `isDragging: boolean` + `dragStart` ref for mouse/touch tracking
- `imageSize: { naturalWidth, naturalHeight }` — loaded from the `<img>` element

**UI layout** (matches the Discord screenshot):
- Dark overlay container
- Title: "Edit Image"
- Visible crop window (fixed 16:9 or similar banner aspect ratio) with the image behind it, scaled by `zoom` and translated by `position`
- Zoom slider row: small image icon — `<Slider />` — large image icon
- "Reset" link (left), "Cancel" + "Apply" buttons (right)

**Pan logic:**
- `onMouseDown` / `onTouchStart` → set `isDragging`, record start coords
- `onMouseMove` / `onTouchMove` → update `position` (clamped so image can't leave the crop window)
- `onMouseUp` / `onTouchEnd` → clear `isDragging`

**Canvas extraction (on "Apply"):**
- Create an offscreen `<canvas>` matching desired output dimensions (e.g. 800×450 for 16:9)
- Calculate the source rectangle from the image's natural dimensions based on current zoom and pan offset
- `ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvasW, canvasH)`
- `canvas.toBlob()` → wrap as `File` → call `onApply(file)`

### Changes to `CreateEventModal.tsx`

**New state:**
```typescript
const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
```

**Modified `handleCoverSelect`:**
Instead of saving directly to form, just set the raw URL:
```typescript
setCropImageUrl(URL.createObjectURL(file));
```

**Conditional render:**
When `cropImageUrl` is set, render `<ImageCropEditor>` in place of the current step content. On "Apply", receive the cropped file, save to form state (`coverFile` + `coverPreview`), clear `cropImageUrl`. On "Cancel", just clear `cropImageUrl`.

### Files

| File | Action |
|------|--------|
| `src/components/server/events/ImageCropEditor.tsx` | Create — crop editor component |
| `src/components/server/events/CreateEventModal.tsx` | Edit — intercept file select, show crop editor |

### What this does NOT touch
- Date/time pickers, frequency dropdown, form submission logic, database schema, any other component

