

## Fix Image Cropper: Zoom & Aspect Ratio Bugs

### Root Cause Analysis

**Bug 1 — Off-center zoom:** The current code manually computes `width`/`height` in pixels and positions the image using `left`/`top` with `calc()`. When zoom changes, the image dimensions grow but the position formula `calc(50% - ${w/2}px + ${pos.x}px)` doesn't properly anchor the scale to the visual center — it re-centers the *top-left corner* relative to the container, causing the zoom to appear anchored to the top-left.

**Bug 2 — Distortion:** The `getDisplaySize()` function computes width and height independently based on zoom, which can produce dimensions that don't match the image's intrinsic aspect ratio in edge cases (particularly when the clamp + position math interacts with the display size calculation).

### The Fix: CSS `transform` approach

Replace the manual width/height/left/top positioning with a single CSS `transform` on the `<img>`. This is mathematically simpler and inherently correct:

**Preview rendering:**
- The `<img>` gets `width`/`height` set to fill the crop area (cover fit, computed once on load) — this preserves aspect ratio by definition since we only set one axis and derive the other.
- Zoom and pan applied via: `transform: translate(${x}px, ${y}px) scale(${zoom})` with `transformOrigin: 'center center'`.
- `scale()` zooms from center automatically — no manual offset math needed.

**Clamp logic:**
- After zoom, the image's visual size is `baseW * zoom` × `baseH * zoom`. Max pan = `(visual - crop) / 2` on each axis, same as now but using the base size × zoom.

**Canvas extraction (Apply only):**
- Compute what portion of the natural image is visible in the crop window:
  - `visibleW = naturalW / zoom`, `visibleH = naturalH / zoom` (scaled proportionally to crop)
  - Offset by pan: `sx = (naturalW - visibleW) / 2 - (pan.x / (baseW * zoom)) * naturalW`
  - Draw that rect onto the 800×450 output canvas.

### Changes

**File:** `src/components/server/events/ImageCropEditor.tsx`

1. **`getDisplaySize()`** — remove zoom from this function. It now returns the base "cover" size only (the minimum size to fill the crop area). Zoom is handled purely by CSS transform.

2. **`<img>` style** — replace manual `width`/`height`/`left`/`top` with:
   ```
   width: baseW, height: baseH,
   left: 50%, top: 50%,
   transform: translate(calc(-50% + panX), calc(-50% + panY)) scale(zoom),
   transformOrigin: 'center center'
   ```

3. **`clamp()`** — update to use `baseSize * zoom` for computing max pan bounds.

4. **`handleApply()`** — rewrite extraction math to derive source rect from natural dimensions, zoom, and pan offset relative to base display size.

### No other files touched
- CreateEventModal.tsx unchanged
- Date/time, frequency, form submission — all untouched

