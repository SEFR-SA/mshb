

## Fix: Match Crop Editor to Cover Preview Size

### Problem
The crop editor viewport (448×252, 16:9) is larger than the cover image previews in steps 2 and 3, which use `w-full h-32` (approximately 448×128, roughly 3.5:1). The user wants the crop editor to match the preview — not the other way around.

### Fix

**File:** `src/components/server/events/ImageCropEditor.tsx`

Update the crop viewport and output canvas dimensions to match the preview's proportions. The modal content area is ~448px wide, and `h-32` = 128px, giving a ratio of 3.5:1.

**New constants:**
```typescript
const CROP_WIDTH = 448;
const CROP_HEIGHT = 128;   // matches h-32 (128px) in the preview
const OUTPUT_WIDTH = 896;  // 2× crop width for high-res output
const OUTPUT_HEIGHT = 256;  // 2× crop height, same 3.5:1 ratio
```

All existing pan/zoom/transform/extraction logic remains untouched — it's ratio-relative and will adapt automatically to the new dimensions.

### What stays untouched
- `CreateEventModal.tsx` — no changes
- Pan, zoom, clamp, canvas extraction logic — unchanged (ratio-relative)
- Date/time, frequency, form submission — untouched

### File

| File | Change |
|------|--------|
| `src/components/server/events/ImageCropEditor.tsx` | Update `CROP_WIDTH`, `CROP_HEIGHT`, `OUTPUT_WIDTH`, `OUTPUT_HEIGHT` |

