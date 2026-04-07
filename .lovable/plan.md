

## Fix: Cover Image Preview Aspect Ratio

### Problem
The cover image preview in Step 2 uses `h-32` (128px fixed height), which doesn't match the crop editor's 16:9 aspect ratio (460×260). The cropped image looks squished/stretched in the preview.

### Fix
Replace `h-32` with `aspect-video` on the preview image in Step 2 (line 307) so it displays at the same 16:9 ratio as the crop editor viewport and the 800×450 output canvas.

### Change

**File: `src/components/server/events/CreateEventModal.tsx`**

Line 307: Change `className="w-full h-32 object-cover rounded-lg"` to `className="w-full aspect-video object-cover rounded-lg"`

Also apply the same fix to the Step 3 review preview image for consistency.

### No other files touched

