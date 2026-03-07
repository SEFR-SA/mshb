# Adding Display Name Fonts & Effects

Users can customize their display name with a font style and a visual effect via **Settings → My Profile → Display Name Style**. These are **Pro-only** features.

---

## How It Works

The `StyledDisplayName` component reads 4 DB columns from the `profiles` table and applies them at render time:

| DB Column | Maps To | Description |
|-----------|---------|-------------|
| `name_font` | `fontStyle` prop | A font key string (e.g., `"gothic"`, `"mono"`) |
| `name_effect` | `effect` prop | An effect key string (e.g., `"neon"`, `"gradient"`) |
| `name_gradient_start` | `gradientStart` prop | Primary color hex (also used for neon/toon/pop/solid effects) |
| `name_gradient_end` | `gradientEnd` prop | Secondary color hex (used for gradient effect only) |

---

## Canonical Usage

```tsx
import StyledDisplayName from "@/components/StyledDisplayName";

<StyledDisplayName
  displayName={profile.display_name || profile.username || "User"}
  fontStyle={profile.name_font}          // from DB
  effect={profile.name_effect}           // from DB
  gradientStart={profile.name_gradient_start}  // from DB
  gradientEnd={profile.name_gradient_end}      // from DB
  className="font-bold text-sm truncate"
/>
```

**CRITICAL:** Any Supabase query that feeds a `StyledDisplayName` render MUST select all 4 fields:
```
name_font, name_effect, name_gradient_start, name_gradient_end
```
If using `select("*")` they are included automatically.

---

## Adding a New Font

Fonts are defined inside `src/components/StyledDisplayName.tsx` (or `src/lib/unicodeFonts.ts` for Unicode-conversion fonts).

### Option A — Unicode font (character substitution)
Edit `src/lib/unicodeFonts.ts` and add a new converter function + register its key.

### Option B — CSS font (Google Fonts / custom)
1. Import the font in `src/index.css` or via a `<link>` in `index.html`
2. In `StyledDisplayName.tsx`, add a `case "myfont":` to the `getFontStyle()` switch that returns `{ fontFamily: "'My Font', sans-serif" }`

---

## Adding a New Effect

Effects are defined in `StyledDisplayName.tsx` inside the `getEffectStyle()` / effect class switch. Add a new `case "myeffect":` that returns the appropriate Tailwind classes or inline CSS.

**Effect color convention:** `name_gradient_start` is the **primary color** for ALL non-gradient effects (Neon glow color, Toon outline color, Pop shadow color, Solid text color). Only the Gradient effect uses both `name_gradient_start` AND `name_gradient_end`.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/components/StyledDisplayName.tsx` | The canonical display name component |
| `src/lib/unicodeFonts.ts` | Unicode character-substitution font converters |
| `src/components/settings/DisplayNameStyleModal.tsx` | The settings UI where users pick font + effect |
