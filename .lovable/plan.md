

## Fix Switch Toggle Direction in RTL (Arabic) Mode

### Problem
The Switch component uses `translate-x-5` to move the thumb when checked. In RTL mode, the layout direction is reversed but `translate-x` always moves to the right, causing the thumb to move outside the container boundary.

### Solution
Update the Switch thumb in `src/components/ui/switch.tsx` to use logical CSS properties that respect text direction:
- Replace `data-[state=checked]:translate-x-5` with `data-[state=checked]:ltr:translate-x-5 data-[state=checked]:rtl:-translate-x-5`
- This ensures the thumb moves in the correct direction based on the document's `dir` attribute

### Changes

**`src/components/ui/switch.tsx`**
- On the `SwitchPrimitives.Thumb` element, update the className to apply directional translate:
  - `data-[state=checked]:ltr:translate-x-5` (moves right in LTR)
  - `data-[state=checked]:rtl:-translate-x-5` (moves left in RTL)

| File | Action |
|------|--------|
| `src/components/ui/switch.tsx` | Modify thumb translate classes for RTL support |

