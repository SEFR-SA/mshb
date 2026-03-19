

## Investigation

The banner container (line 86) is a `div` with no border-radius. The `img` inside (line 88) also has no rounding. Since the root container uses `overflow-visible` (changed in the previous fix to allow the status submenu to escape), the banner image's hard corners are no longer clipped by the parent's `rounded-xl`.

## Fix

**File: `src/components/layout/UserPanelPopover.tsx`**

Add `rounded-t-xl` to the banner container div (line 86) and `rounded-t-xl` to the banner `img` (line 88) so the top corners match the popover's border radius. The `overflow-hidden` on the banner container will clip the image properly.

```tsx
// Line 86: Add rounded-t-xl and overflow-hidden
<div className="relative h-24 w-full z-[2] rounded-t-xl overflow-hidden">

// Line 88: img stays the same (container clips it)
<img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
```

Single file, two-class addition.

