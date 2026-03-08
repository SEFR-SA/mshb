# Customization Engine

This document covers everything related to MSHB's cosmetic customization system — Pro gating, wrapper components, asset dimensions, color themes, and SVG badges.

---

## Monetization & Mshb Pro

- **Pro-Only by Default:** All newly requested cosmetic/premium features are **exclusive to Mshb Pro** plan holders unless explicitly instructed otherwise.
- **Graceful Degradation:** Do NOT completely hide premium features. Display them with a "Lock" icon, a "PRO" badge, or `opacity-50`.
- **UI Locks & Toasts:** If a free user interacts with a Pro feature, block the action and show a toast: `"Requires Mshb Pro. Upgrade to unlock this feature."`
- **Validation:** Always check `profile?.is_pro` (from `useAuth()`) before executing premium logic.

---

## Single Source of Truth — Wrapper Components (MANDATORY)

Never inline cosmetic rendering. Always use these canonical components:

| Feature | Component | Location | Required Props |
|---------|-----------|----------|----------------|
| Styled display name | `StyledDisplayName` | `@/components/StyledDisplayName` | `displayName`, `fontStyle={p.name_font}`, `effect={p.name_effect}`, `gradientStart={p.name_gradient_start}`, `gradientEnd={p.name_gradient_end}` |
| Avatar decoration frame | `AvatarDecorationWrapper` | `@/components/shared/AvatarDecorationWrapper` | `decorationUrl`, `isPro`, `size` (px integer) |
| Nameplate background | `NameplateWrapper` | `@/components/shared/NameplateWrapper` | `nameplateUrl`, `isPro` |
| Profile effect overlay | `ProfileEffectWrapper` | `@/components/shared/ProfileEffectWrapper` | `effectUrl`, `isPro` |

**StyledDisplayName — mandatory Supabase select fields:**
Any profile query that renders a styled name MUST include all 4 fields:
```
name_font, name_effect, name_gradient_start, name_gradient_end
```
`select("*")` includes them automatically. Explicit field lists MUST add all 4. Omitting even one silently breaks fonts or color effects.

**Common mistake:** Using `StyledDisplayName` but only passing `gradientStart`/`gradientEnd` while omitting `fontStyle` and `effect`. This breaks custom fonts and neon/toon/pop effects while appearing fine for gradient-only users.

---

## Canonical Asset Dimensions

| Asset Type | Dimensions | @2× (Retina) | Format | Background |
|---|---|---|---|---|
| Avatar Decorations | **144 × 144 px** | 288 × 288 px | APNG / WebP (animated), PNG (static) | Transparent |
| Nameplates | **224 × 42 px** | 448 × 84 px | APNG / WebP (animated), PNG (static) | Opaque or semi-transparent |
| Profile Effects | **480 × 880 px** | 960 × 1760 px | APNG / WebP (animated) | Transparent |
| Server Tag Badges | **16 × 16 px** | 32 × 32 px | SVG (vector) | Transparent |

> **Never guess dimensions.** If unsure, read `docs/cosmetic-assets/<asset>.md` or ask the user.

---

## Premium Assets — Config Files

All premium assets are **curated by the admin** (no user uploads). Add entries to these hardcoded arrays:

| Asset Type | Config File | Object Shape |
|---|---|---|
| Avatar Decorations | `src/lib/decorations.ts` | `{ id, name, url, animated? }` |
| Nameplates | `src/lib/nameplates.ts` | `{ id, name, url, animated? }` |
| Profile Effects | `src/lib/profileEffects.ts` | `{ id, name, url, animated? }` |

**Steps:**
1. Export as APNG or WebP (never GIF). Transparent backgrounds for Decorations and Effects.
2. Host on Supabase Storage or CDN. Copy the public URL.
3. Add `{ id: "snake_case_id", name: "Display Name", url: "https://...", animated: true }` to the config array.
4. Done — no component changes needed.

**Database columns (profiles table):**
- `avatar_decoration_url` — selected decoration URL
- `nameplate_url` — selected nameplate URL
- `profile_effect_url` — selected profile effect URL

---

## Adding a Color Theme

**Execute immediately when user provides a palette — no planning step required.**

**Only one file to edit:** `src/contexts/ThemeContext.tsx` — add to `COLOR_THEME_PRESETS` array.
- `AppearanceTab.tsx` auto-renders all presets — no changes needed
- `src/index.css` is NOT touched — themes are applied via JavaScript
- No i18n changes needed

### Rule 1 — Identify the Type

| User provides | Type | `solid` flag | `colors` array |
|---|---|---|---|
| Solid hex codes only | Solid | `solid: true` | Single entry: `["#bg_hex"]` |
| `linear-gradient(...)` | Gradient | omit | 2-3 gradient stop hexes |

### Rule 2 — Solid Theme
**Never invent gradients from solid hex codes.** Use `colors: ["#bg_hex"]` (single entry). `solid: true` adds `.solid-theme-active` to `<html>` — panels become fully opaque.

### Rule 3 — Gradient Theme
Use 2-3 hex stops. **`colors[0]` MUST equal the primary background hex** — it maps to `--background`.

### Rule 4 — Skeleton Contrast
`--color-bg-muted` MUST visibly differ from `--color-bg`. ThemeContext auto-sets `--skeleton-highlight` to the primary color — do NOT set it manually.

### Preset Object Shape

```typescript
{
  id: "snake_case_id",
  name: "Display Name",
  colors: ["#bg_hex"],       // solid: 1 entry; gradient: 2-3 stops
  primary: "#hex",           // accent → --primary, --ring, --skeleton-highlight
  solid: true,               // ONLY for solid themes; omit for gradients
  vars: {
    "--color-bg":              "#hex",          // solid hex or linear-gradient(...)
    "--color-bg-muted":        "#hex",          // MUST differ from --color-bg
    "--color-surface":         "#hex",
    "--color-border":          "#hex",
    "--color-primary":         "#hex",
    "--color-primary-dark":    "#hex",
    "--color-text":            "#hex",
    "--color-text-muted":      "#hex",
    "--color-text-on-primary": "#hex",
    "--color-hover":           "#hex",
    "--color-shadow":          "rgba(...)",
  },
},
```

**Placement groups:** Light/Pastel | Vibrant/Synthwave | Deep/Elegant Dark

**What happens automatically:**
- `.solid-theme-active` → panels fully opaque
- `.gradient-active` → glassmorphism (30% opacity + backdrop-blur)
- All non-default presets are Pro-gated automatically
- Omit non-standard vars (e.g. `--color-accent-gold`) — they leak to other themes

---

## Adding a New SVG Badge

**Execute immediately when user provides an SVG — no planning step required.**

### 3 Files to Edit

**1. CREATE** `src/components/ui/badges/<BadgeName>Badge.tsx`
- Paste user's code. Fix any malformed `xmlns` (see bug below).
- Interface: `{ color: string; className?: string }`
- Use `fill="currentColor"` for the path; `style={{ color }}` on the `<svg>` element.

**2. EDIT** `src/components/ServerTagBadgeIcon.tsx` — add to `CUSTOM_BADGE_COMPONENTS`:
```typescript
const CUSTOM_BADGE_COMPONENTS: Record<string, CustomBadgeComponent> = {
  orb: OrbBadge,
  myNewBadge: MyNewBadge,  // ← add here
};
```

**3. EDIT** `src/components/server/settings/ServerTagTab.tsx` — add to `BADGE_OPTIONS`:
```typescript
{ id: "myNewBadge", Icon: MyNewBadge, label: "My Badge", custom: true },
```

**Why `custom: true`?** Lucide icons receive color via CSS `currentColor`. Custom SVGs receive color via the `color` prop. `custom: true` tells the grid renderer to use the prop-based path.

**No DB migration needed.** Badge ID is a plain string in `servers.server_tag_badge`.

### xmlns Bug — Always Fix
```
xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)"  ← INVALID (markdown corrupts it)
xmlns="http://www.w3.org/2000/svg"                                ← CORRECT
```

---

## Debugging Common Issues

| Problem | Where to look |
|---------|--------------|
| Auth / sign-in fails | `AuthContext.tsx` — `signIn` resolves usernames to emails via Supabase RPC |
| Images/assets broken in Electron | Never use absolute paths (`/image.png`). Use `import img from "@/assets/image.png"` or full CDN URLs. Always add `onError` fallback on `<img>` tags. |
| File upload failing | Check Supabase Storage bucket policies; `uploadChatFile()` in `src/lib/uploadChatFile.ts` |
