

## Clear All Color Theme Presets & Add "Ember" Theme

### Changes

**File: `src/contexts/ThemeContext.tsx` — Lines 14-160**

Replace the entire `COLOR_THEME_PRESETS` array with just Default + the new theme:

```typescript
export const COLOR_THEME_PRESETS: ColorThemePreset[] = [
  { id: "default", name: "Default", colors: [] },

  // ─── DEEP / ELEGANT DARK THEMES ──────────────────────────────────────────

  {
    id: "ember", name: "Ember",
    colors: ["#161312"], primary: "#e65e2d", solid: true,
    vars: {
      "--color-bg": "#161312",
      "--color-bg-muted": "#221d1b",
      "--color-surface": "#1c1817",
      "--color-border": "#332c29",
      "--color-primary": "#e65e2d",
      "--color-primary-dark": "#c84718",
      "--color-text": "#f4f2f1",
      "--color-text-muted": "#afa29d",
      "--color-text-on-primary": "#ffffff",
      "--color-hover": "#e97044",
      "--color-shadow": "rgba(0, 0, 0, 0.3)",
    },
  },
];
```

Key decisions per CLAUDE.md rules:
- **Type = Solid** → single hex in `colors`, `solid: true` — ThemeContext adds `.solid-theme-active`, panels become fully opaque
- **`colors[0]` = `#161312`** = primary background hex (mapped to `--background`)
- **`--color-bg-muted` (`#221d1b`) differs from `--color-bg` (`#161312`)** — skeleton pulse will be visible
- **No `--color-accent-gold`** — omitted per CLAUDE.md ("Omit non-standard vars… they leak to other themes on switch"). The `#5ac9f2` value from the user's CSS is intentionally excluded
- **Group**: Deep / Elegant Dark
- Named **"Ember"** — warm dark palette with orange primary

**No other files change.** `AppearanceTab.tsx` auto-renders all presets.

### What Gets Removed
All 26 previous color themes (cotton_candy through phantom_noir). Only "Default" + "Ember" remain. Future themes will be added incrementally to this array.

