

## Fix: Aspect Ratio Mismatch in Image Crop Editor

### Problem

The crop editor viewport and the output canvas use different aspect ratios:

| Surface | Dimensions | Ratio |
|---------|-----------|-------|
| Crop viewport | 460 × 260 | **~1.77:1** (16:9) |
| Output canvas | 800 × 450 | **~1.78:1** (16:9) |
| Form preview (step 2) | `w-full h-32` | **variable** (depends on modal width) |
| Review preview (step 3) | `w-full h-32` | **variable** |
| EventCard display | `w-full h-40` | **variable** |

The crop viewport and output canvas are nearly identical (both ~16:9), so the cropping itself is consistent. The **visual inconsistency** is that the preview thumbnails in the form (step 2 and step 3) use a fixed `h-32` (128px), which at the modal's ~430px content width produces roughly a **3.4:1** ratio — much wider/shorter than the 16:9 crop. This means what the user carefully framed in the editor looks different in the preview.

### Fix

Use `aspect-video` (Tailwind's 16:9 aspect ratio class) on the cover preview images in `CreateEventModal.tsx` instead of fixed `h-32`, so they match the crop editor's 16:9 viewport exactly.

### Changes

**File: `src/components/server/events/CreateEventModal.tsx`**

1. **Step 2 preview** (line ~307): Change `h-32` to `aspect-video` on the `<img>`.
2. **Step 3 preview** (line ~338): Change `h-32` to `aspect-video` on the `<img>`.

**File: `src/components/server/events/EventCard.tsx`**

3. **Event card** (line ~59): Change `h-40` to `aspect-video` for consistency across all surfaces.

No changes to `ImageCropEditor.tsx` — its crop viewport and output canvas are already aligned at 16:9.

