

## Color Themes Feature (Discord Nitro-style, free for all)

### Overview
Add a "Color Themes" section to Settings with a grid of 20+ preset gradient swatches plus a custom theme builder. Clicking a swatch instantly previews the gradient across the entire app (sidebar, chat area, backgrounds). The selection is saved to the database and restored on login.

### Database Migration

Add a `color_theme` column to the `profiles` table to persist the user's selected theme ID (or a custom gradient string):

```sql
ALTER TABLE public.profiles
ADD COLUMN color_theme text DEFAULT 'default';
```

This stores either a preset theme ID (e.g., `"midnight"`, `"sunset"`) or a custom gradient string (e.g., `"custom:#1a1a2e,#16213e,#0f3460"`).

---

### Preset Gradient Themes (20 themes)

Inspired by the Discord Nitro reference image, these cover a wide range of moods:

| ID | Name | Gradient Colors |
|---|---|---|
| default | Default | No gradient (standard solid backgrounds) |
| midnight | Midnight | #1a1a2e to #16213e to #0f3460 |
| sunset | Sunset | #ff6b35 to #f7c59f to #efefd0 |
| forest | Forest | #0b3d0b to #1a5c2a to #2d8a4e |
| aurora | Aurora | #1a0533 to #3a1078 to #4361ee |
| ember | Ember | #1a0000 to #4a0000 to #8b0000 |
| ocean | Ocean | #0a1628 to #1a3a5c to #2196f3 |
| lavender | Lavender | #2d1b4e to #4a2c6e to #7b5ea7 |
| rose | Rose | #4a1942 to #6b2d5b to #c2185b |
| mint | Mint | #0d3b2e to #1a6b5a to #26a69a |
| candy | Candy | #ff6ec7 to #7873f5 to #4adede |
| dusk | Dusk | #2c1654 to #4a1942 to #d4145a |
| arctic | Arctic | #0d2137 to #1a4570 to #4fc3f7 |
| bronze | Bronze | #1a1206 to #3d2c0a to #8d6e2c |
| neon | Neon | #0a0a23 to #1b0a3c to #6200ea |
| coral | Coral | #3e1929 to #6b2d3a to #e57373 |
| storm | Storm | #1a1a2e to #2d2d44 to #4a4a6a |
| golden | Golden | #1a1400 to #3d3000 to #ffd700 |
| teal_night | Teal Night | #0a2929 to #134e4e to #009688 |
| magma | Magma | #1a0a00 to #4a1a00 to #ff5722 |

---

### CSS Variable System

New CSS custom properties added alongside the existing ones:

```
--theme-gradient: none;           /* "none" or a CSS gradient string */
--theme-sidebar-bg: transparent;  /* overlay for sidebar */
--theme-chat-bg: transparent;     /* overlay for chat area */
```

When a color theme is active, the `ThemeContext` applies the gradient as a background on the root `<div>` via inline style. The existing dark/light base variables remain unchanged -- the gradient overlays on top using a semi-transparent approach so text remains readable.

---

### ThemeContext Changes

Expand the context to manage `colorTheme`:

- New state: `colorTheme` (string, default `"default"`)
- New method: `setColorTheme(id: string)`
- On change: apply CSS variables for the gradient to `document.documentElement.style`
- Load from profile on login, persist to localStorage for instant restore, save to DB on Settings save

The gradient is applied as `--theme-gradient` which is consumed by `.galaxy-gradient` utility class and directly on `AppLayout`.

---

### Settings UI -- "Color Themes" Card

A new Card section in Settings between the appearance card and action buttons:

- Title: "Color Themes" with a palette icon
- A responsive grid (4 columns on desktop, 3 on mobile) of theme swatches
- Each swatch is a 56x56px rounded square showing the gradient preview
- Active theme has a highlight border (using `--primary` color)
- First item: "Default" (solid background, no gradient)
- Last item: "Custom" with a paint palette icon -- clicking it expands two color pickers (gradient start & end colors)
- Clicking any swatch instantly previews the theme app-wide

---

### AppLayout Integration

The main layout wrapper (`AppLayout.tsx`) reads the gradient from ThemeContext and applies it as a background style on the root div, replacing or overlaying the plain `bg-background`.

---

### Files Modified

| File | Changes |
|---|---|
| `src/contexts/ThemeContext.tsx` | Add `colorTheme` state, gradient presets data, CSS variable application, `setColorTheme` method |
| `src/pages/Settings.tsx` | Add "Color Themes" card with swatch grid and custom theme picker |
| `src/components/layout/AppLayout.tsx` | Apply gradient background from ThemeContext |
| `src/index.css` | Add `--theme-gradient` variable and update `.galaxy-gradient` utility |
| `src/i18n/en.ts` | Add translation keys for color themes section |
| `src/i18n/ar.ts` | Add Arabic translation keys for color themes section |
| **Migration** | Add `color_theme` column to `profiles` table |

### Persistence Flow

1. User picks a theme swatch -- instant CSS preview via ThemeContext
2. User clicks "Save Changes" -- theme ID saved to `profiles.color_theme` in database
3. On login, `AuthContext` fetches profile including `color_theme`
4. `ThemeContext` reads from profile and applies the gradient on mount
5. localStorage caches the value for instant load before profile fetch completes

