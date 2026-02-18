

## Theme Engine Overhaul -- Luminance-Aware Adaptive Theming

### Overview
Refactor the theme engine so that selecting a gradient theme automatically adapts text colors, component surfaces, and modal backgrounds based on the gradient's luminance. The Dark/Light toggle remains the master override for surface colors, while gradients act as the background layer.

---

### 1. Luminance Utility Function

**File: `src/contexts/ThemeContext.tsx`**

Add a `getAverageLuminance(colors: string[]): number` helper that:
- Converts each hex color to relative luminance using the standard formula: `0.2126*R + 0.7152*G + 0.0722*B`
- Returns the average across all gradient colors (0 = black, 1 = white)
- Threshold: luminance > 0.4 = "light gradient", else "dark gradient"

Expose a new boolean `isGradientLight` from the context so all components can consume it.

---

### 2. Dynamic CSS Variable Injection

**File: `src/contexts/ThemeContext.tsx`** (inside the `colorTheme` effect)

When a non-default gradient is selected, inject adaptive CSS variables onto `document.documentElement`:

| Variable | Dark Gradient Value | Light Gradient Value |
|----------|-------------------|---------------------|
| `--foreground` | `0 0% 100%` (white) | `240 6% 3%` (near-black) |
| `--card-foreground` | same as above | same as above |
| `--popover-foreground` | same as above | same as above |
| `--muted-foreground` | `215 10% 75%` | `215 10% 35%` |
| `--component-bg` | `rgba(0,0,0,0.3)` | `rgba(255,255,255,0.3)` |
| `--component-border` | `rgba(255,255,255,0.1)` | `rgba(0,0,0,0.1)` |
| `--popover` | derived from darkest gradient color | derived from lightest gradient color |
| `--card` | derived from darkest gradient color | derived from lightest gradient color |

When `colorTheme` resets to `"default"`, remove these overrides so the base dark/light CSS kicks back in.

---

### 3. Component Surface Updates

**Files: `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/select.tsx`, `src/components/ui/popover.tsx`**

Replace hardcoded `bg-background/20`, `bg-background`, `border-input` references with the new CSS variables:
- Input/Textarea background: `var(--component-bg)` with fallback to current value
- Border: `var(--component-border)` with fallback
- This is done via a small CSS class `.theme-input` in `index.css` that these components use

---

### 4. Modal & Popup Consistency

**File: `src/components/ui/dialog.tsx`**

Update `DialogContent` to:
- Use `backdrop-filter: blur(12px)` on the content itself
- Use `var(--component-bg)` as background with a solid fallback from `--popover`
- This ensures modals look glassy and inherit the gradient context

**File: `src/components/ui/popover.tsx`**
- Same treatment: add `backdrop-blur-xl` and semi-transparent background

---

### 5. Contrast Safety Net

**File: `src/index.css`**

Add a utility class applied when a gradient theme is active:

```css
.gradient-active {
  --text-safety-shadow: 0 1px 2px rgba(0,0,0,0.3);
}
.gradient-active.gradient-light {
  --text-safety-shadow: 0 1px 2px rgba(255,255,255,0.3);
}
```

The ThemeContext will toggle the `gradient-active` and `gradient-light` classes on `<html>`.

Key text elements (message content, channel names, headers) gain `text-shadow: var(--text-safety-shadow, none)` via a `.theme-text` utility class.

---

### 6. Dark/Light Toggle as Master Override

The existing dark/light toggle continues to set the base CSS variables (`:root` vs `.dark`). The gradient injection layer sits on top -- it only overrides foreground/surface variables when a gradient is active. When the user switches dark/light mode, the base variables reset first, then the gradient overrides reapply. This is handled by making the gradient effect depend on both `colorTheme` and `theme`.

---

### Files Summary

| File | Action |
|------|--------|
| `src/contexts/ThemeContext.tsx` | Add luminance calculation, `isGradientLight`, CSS variable injection, toggle `gradient-active`/`gradient-light` classes |
| `src/index.css` | Add `.theme-input`, `.theme-text`, `.gradient-active` utility classes, update `.glass` |
| `src/components/ui/dialog.tsx` | Add backdrop-blur and semi-transparent background to DialogContent |
| `src/components/ui/popover.tsx` | Add backdrop-blur and semi-transparent background to PopoverContent |
| `src/components/ui/input.tsx` | Use `.theme-input` class / `var(--component-bg)` |
| `src/components/ui/textarea.tsx` | Use `.theme-input` class / `var(--component-bg)` |
| `src/components/ui/select.tsx` | Use adaptive background variables |
| `src/components/layout/AppLayout.tsx` | Minor -- no changes needed, already uses `getGradientStyle` |

