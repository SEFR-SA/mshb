

## Standardize Event Banner Aspect Ratio

### Problem

The crop viewport is 460×260 (ratio 1.769:1) but the output canvas is 800×450 (ratio 1.778:1 = 16:9). This slight mismatch means the extracted image includes slightly more or less content than what the user sees during cropping.

### Fix

Change `CROP_HEIGHT` from `260` to `259` — wait, that's still not exact. The cleanest fix: make both use exact 16:9.

**New constants:**
```
CROP_WIDTH  = 460
CROP_HEIGHT = 259  // 460 / (16/9) = 258.75, rounds to 259 — still imprecise
```

Better approach — use a clean 16:9 crop viewport:
```
CROP_WIDTH  = 464   // 464 / 16 * 9 = 261
CROP_HEIGHT = 261
```

Actually simplest: keep `CROP_WIDTH = 460`, set `CROP_HEIGHT = Math.round(460 * 9 / 16) = 259`. The output is 800×450 which is exact 16:9. The 0.03% rounding error at 259 vs 258.75 is invisible. But to be pixel-perfect, use **448×252** (both cleanly divisible: 448/16=28, 252/9=28).

**Final constants:**
```typescript
const CROP_WIDTH = 448;
const CROP_HEIGHT = 252;   // exact 16:9
const OUTPUT_WIDTH = 800;
const OUTPUT_HEIGHT = 450;  // exact 16:9
```

This is the only change needed. The crop viewport and canvas output now share the exact same 16:9 ratio, so "what you see is what you get."

### File

| File | Change |
|------|--------|
| `src/components/server/events/ImageCropEditor.tsx` | Update `CROP_WIDTH` to 448, `CROP_HEIGHT` to 252 |

### What stays untouched
- All pan/zoom/transform logic (already correct — it's ratio-relative)
- CreateEventModal.tsx — no changes needed
- Date/time, frequency, form submission — untouched

