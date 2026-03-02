

## Custom Theme Generator — Phase 1 Plan

### Goal
Create `src/lib/themeGenerator.ts` — a pure utility that takes one hex color and returns a complete `ColorThemePreset` object matching the existing schema.

### Color Math Approach

The input hex is converted to HSL. From there, two variant palettes are derived — one for light backgrounds, one for dark — based on the background's luminance. The function auto-detects which mode to use based on the primary color's lightness (light primaries get dark backgrounds; vivid/dark primaries get light backgrounds), but a manual override parameter is also available.

**Derivation rules (light-bg variant):**

| Variable | Derivation from primary HSL (H, S, L) |
|---|---|
| `--color-primary` | Input hex as-is |
| `--color-primary-dark` | H, S, L−15 |
| `--color-hover` | H, S, L−12 |
| `--color-bg` | H, S×0.08, 98 (barely tinted white) |
| `--color-bg-muted` | H, S×0.10, 94 |
| `--color-surface` | `#ffffff` |
| `--color-border` | H, S×0.12, 89 |
| `--color-text` | H, S×0.20, 18 |
| `--color-text-muted` | H, S×0.15, 42 |
| `--color-text-on-primary` | `#ffffff` |
| `--color-shadow` | `rgba(0,0,0,0.06)` |

**Dark-bg variant** mirrors this with inverted lightness (bg at L=8, surface at L=10, text at L=96, etc.) and shadow opacity 0.3.

**Return shape:**
```typescript
{
  id: "custom",
  name: "Custom",
  colors: [bgHex],       // single entry → solid
  primary: inputHex,
  solid: true,
  vars: { /* all 11 --color-* vars */ }
}
```

### Phase 2: `generateRandomTheme()`
Same file. Picks random H (0–360), S (65–85%), L (48–58%) → converts to hex → passes to the generator. Ensures vivid, never-muddy results.

### Phase 3: `ThemeBuilder.tsx`
A full-screen overlay component with:
- **Left**: Static mock UI (fake server rail + sidebar + chat area) styled via the generated `vars` applied as inline `style` on a wrapper div
- **Right**: Control panel with `<input type="color" />`, "Surprise Me!" button, dark/light toggle, Save/Cancel
- Live preview updates via React state — no persistence until Save
- On Save: calls `setColorTheme("custom")` after injecting the custom preset into the presets array (or storing in localStorage as `custom:` format already supported by `getColorsForTheme`)

### Phase 4: Entry Banner in `AppearanceTab.tsx`
A styled card above the Color Themes grid with the copy from the spec and a "Create Theme" button. Pro-gated with lock icon for free users.

### Files touched
1. **New**: `src/lib/themeGenerator.ts` — color math + random generator
2. **New**: `src/components/settings/ThemeBuilder.tsx` — preview UI
3. **Edit**: `src/components/settings/tabs/AppearanceTab.tsx` — add banner + ThemeBuilder launch
4. **Edit**: `src/contexts/ThemeContext.tsx` — add support for a `custom` preset stored in localStorage
5. **Edit**: `src/i18n/en.ts` + `src/i18n/ar.ts` — translation keys

### Questions before proceeding

None — the schema is clear and the math is straightforward. Ready to execute Phase 1 on your approval.

