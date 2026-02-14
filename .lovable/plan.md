

## Replace Purple Galaxy Theme with Discord-Style Theme

### Overview
Replace all purple galaxy styling with a Discord-inspired color scheme. The primary action color for buttons becomes `#084f00` (deep green). Light and dark modes will match Discord's neutral gray palette. All galaxy-specific CSS utilities (`galaxy-gradient`, `galaxy-glow`, `text-galaxy-glow`) will be replaced with simple solid backgrounds.

### Color Mapping (from Discord screenshots)

**Dark Mode** (matching the dark Discord screenshot):
- Background (main content): `#313338` (gray, ~220 7% 20%)
- Sidebar background: `#2b2d31` (slightly darker gray, ~220 6% 18%)
- Server rail / deepest layer: `#1e1f22` (darkest gray, ~220 6% 13%)
- Card/popover: `#2b2d31`
- Text: `#f2f3f5` (near white)
- Muted text: `#949ba4` (gray)
- Border: `#3f4147`
- Input background: `#1e1f22`
- Accent/active channel: `#404249`

**Light Mode** (matching the light Discord screenshot):
- Background: `#ffffff`
- Sidebar background: `#f2f3f5`
- Server rail: `#e3e5e8`
- Card/popover: `#ffffff`
- Text: `#060607` (near black)
- Muted text: `#5c6470`
- Border: `#e1e2e4`
- Input background: `#e3e5e8`
- Accent/hover: `#eaebed`

**Primary (both modes):** `#084f00` -- used for buttons, links, active indicators, rings. HSL approximation: `113 100% 15%`. Lighter grades for hover/foreground as needed.

### Changes

**`src/index.css`**
- Replace all `:root` (light) CSS variables with Discord light mode values
- Replace all `.dark` CSS variables with Discord dark mode values
- Set `--primary` to green `#084f00` in both modes (HSL: `113 100% 15%`)
- Set `--primary-foreground` to white
- Remove `--galaxy-glow`, `--galaxy-deep`, `--galaxy-nebula`, `--galaxy-star` variables from both modes
- Replace `.glass` utility: change from `bg-card/60 backdrop-blur-xl` to just `bg-card` (solid, no glassmorphism)
- Replace `.galaxy-gradient` utility with `background: hsl(var(--background))` (solid background)
- Remove `.galaxy-glow` and `.text-galaxy-glow` utilities (or make them no-ops)
- Update sidebar variables to match Discord's slightly darker sidebar color

**`tailwind.config.ts`**
- Remove the `galaxy` color definitions (`glow`, `deep`, `nebula`, `star`)
- Keep all other color mappings (they reference CSS variables which will be updated)

**`src/components/layout/AppLayout.tsx`**
- Remove `galaxy-gradient` class from root div, replace with `bg-background`
- Remove `text-galaxy-glow` from the app name heading
- Remove the `star` character or keep it plain without glow

**`src/pages/Auth.tsx`**
- Remove `galaxy-gradient` from container div, use `bg-background`
- Remove `galaxy-glow` from Card
- Remove `text-galaxy-glow` from title
- Keep the card styled with `glass` (which will now be solid `bg-card`)

**`src/App.tsx`**
- Remove `galaxy-gradient` from the loading screen div

**`src/contexts/ThemeContext.tsx`**
- Rename localStorage key from `galaxy-theme` to `app-theme` (cosmetic cleanup)

### Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/index.css` | Modify | Replace all color variables with Discord palette; green primary; remove galaxy utilities |
| `tailwind.config.ts` | Modify | Remove galaxy color definitions |
| `src/components/layout/AppLayout.tsx` | Modify | Remove galaxy classes |
| `src/pages/Auth.tsx` | Modify | Remove galaxy classes |
| `src/App.tsx` | Modify | Remove galaxy-gradient from loading screen |
| `src/contexts/ThemeContext.tsx` | Modify | Rename localStorage key |

### What stays the same
- All page layouts, component structure, and routing remain unchanged
- The `glass` class still exists but becomes a solid `bg-card` with border (no blur)
- All shadcn/ui components automatically pick up new colors through CSS variables
- Online status color stays green

