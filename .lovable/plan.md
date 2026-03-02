

## Phase 1: Architecture Audit — How Our Color System Works

### CSS Variable Structure (Sound)

Our `src/index.css` defines semantic HSL variables for 4 base themes (`:root`, `.dark`, `.sado`, `.majls`). These are correctly mapped in `tailwind.config.ts` to Tailwind tokens (`bg-accent`, `text-foreground`, etc.). The architecture itself is well-designed.

### The Root Cause: `--accent` Is Never Updated by the Theme Engine

When a user selects a color theme preset (e.g., "Viper Green"), `ThemeContext.tsx` maps preset variables like this:

| Preset Variable | Maps to Shadcn Variable | Status |
|---|---|---|
| `--color-primary` → `--primary` | Buttons, links | **Working** |
| `--color-bg-muted` → `--muted` | Muted backgrounds | **Working** |
| `--color-bg-muted` → `--sidebar-background` | Sidebar bg | **Working** |
| `--color-hover` → `--sidebar-accent` | Sidebar item hover | **Working** |
| `--color-surface` → `--card`, `--popover`, `--surface` | Cards, popovers | **Working** |
| `--color-hover` → `--accent` | **NEVER MAPPED** | **BROKEN** |

So `--accent` stays at its base-theme default (a neutral gray like `225 5% 26%` in dark mode). Every component using `focus:bg-accent` or `hover:bg-accent` gets a gray hover regardless of theme.

### Which Components Are Affected?

All of our Radix UI primitives use `focus:bg-accent focus:text-accent-foreground` for interactive highlights. These are the components with the gray hover bug:

| Component | File | Hover Class |
|---|---|---|
| ContextMenuItem | `src/components/ui/context-menu.tsx` | `focus:bg-accent` |
| DropdownMenuItem | `src/components/ui/dropdown-menu.tsx` | `focus:bg-accent` |
| SelectItem | `src/components/ui/select.tsx` | `focus:bg-accent` |
| MenubarItem | `src/components/ui/menubar.tsx` | `focus:bg-accent` |
| NavigationMenuTrigger | `src/components/ui/navigation-menu.tsx` | `hover:bg-accent` |
| Button (outline, ghost) | `src/components/ui/button.tsx` | `hover:bg-accent` |
| Toggle | `src/components/ui/toggle.tsx` | `hover:bg-muted` / `hover:bg-accent` |

Custom components (ChatSidebar, EmojiPicker, etc.) correctly use `hover:bg-muted/50` which IS updated — those are fine.

## Phase 2: The Fix

The fix is a **one-line addition** in `ThemeContext.tsx`. When `--color-hover` is mapped to `--sidebar-accent`, it must also be mapped to `--accent`:

**File: `src/contexts/ThemeContext.tsx`** (around line 411)

```typescript
// Current:
if (pv["--color-hover"]) root.style.setProperty("--sidebar-accent", hexToHsl(pv["--color-hover"]));

// Add immediately after:
if (pv["--color-hover"]) root.style.setProperty("--accent", hexToHsl(pv["--color-hover"]));
```

Additionally, `--accent` must be added to the `COLOR_THEME_EXTRA_VARS` cleanup array so it resets properly when switching back to a base theme.

**File: `src/contexts/ThemeContext.tsx`** (around line 242)

Add `"--accent"` to the existing line that already contains `"--surface"`.

### What This Fixes

- Context menus (right-click username, messages, threads) will use the theme's hover color
- Dropdown menus will match the theme
- Select item highlights will match
- Ghost/outline button hovers will match
- All components using `focus:bg-accent` or `hover:bg-accent` inherit the theme

### What Does NOT Change

- No UI component files need modification — they already use the correct semantic classes
- No CSS variable definitions change
- No Tailwind config changes
- Base themes (when no color preset is active) continue to work with their defined `--accent` values

