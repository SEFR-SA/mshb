

## Skeleton Loading Fix

### Root Cause

The skeleton uses a custom `animate-shimmer` animation defined in `src/index.css` (line 339-342) that creates a sweeping gradient using `--skeleton-highlight` — which is set to the theme's **primary color** by `ThemeContext.tsx`. This produces a harsh, attention-grabbing shimmer in the primary accent color.

### Changes

**File: `src/components/ui/skeleton.tsx`**

Replace `animate-shimmer` with `animate-pulse bg-muted/80`:

```tsx
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted/80", className)} {...props} />;
}
```

**File: `src/index.css` — Lines 327-342**

Remove the entire skeleton shimmer block (the `--skeleton-highlight` CSS custom properties, the `@keyframes shimmer`, and the `.animate-shimmer` class). These are now dead code.

**File: `src/contexts/ThemeContext.tsx`**

- Line 246: Remove `"--skeleton-highlight"` from the cleanup array
- Line 425: Remove the `root.style.setProperty("--skeleton-highlight", hsl)` call

**File: `src/components/skeletons/SkeletonLoaders.tsx`**

No changes needed — all skeleton items use structural classes only (`h-9 w-9 rounded-full`, `h-3.5 w-[70%]`, etc.) and inherit from the base `Skeleton` component. Already correct.

### Result

| Aspect | Before | After |
|--------|--------|-------|
| Animation | Sweeping gradient shimmer | Soft opacity pulse |
| Color | Theme primary (harsh) | `bg-muted/80` (subtle, neutral) |
| Custom CSS | 15+ lines of keyframes + vars | Zero — pure Tailwind |

