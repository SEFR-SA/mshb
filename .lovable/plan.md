

## Foundational Layout Overhaul: Discord "Layered Surface" Design

### Current State

The app uses a flat layout where Server Rail (`bg-background`), title bar (`bg-background`), and main content all share the same background color. Sidebars (ChannelSidebar, HomeSidebar) use `bg-muted/70 backdrop-blur-sm` with a `border-e border-border/50`. Everything feels co-planar.

### Target State (Discord Reference)

Two visual layers:
1. **Base Layer** (darker): Server Rail + Electron title bar sit on this. Background shows through.
2. **Content Card** (lighter/surface): Everything to the right of the Server Rail — ChannelSidebar, chat area, member list, HomeSidebar, etc. — wrapped in a single container with a `rounded-tl-[16px]` corner, creating the illusion of a card floating on the base.

### Architecture

```text
┌──────────────────────────────────────────────┐
│  Title Bar (bg-background, no bottom border) │
├────┬─────────────────────────────────────────┤
│    │ ╭──────────────────────────────────────  │
│ S  │ │  Main Content Card (bg-card / surface)│
│ R  │ │  rounded-tl-[16px]                    │
│ a  │ │  ┌──────────┬──────────┬──────────┐   │
│ i  │ │  │ Channel  │  Chat    │ Members  │   │
│ l  │ │  │ Sidebar  │  Area    │  List    │   │
│    │ │  └──────────┴──────────┴──────────┘   │
│(bg-│ │                                       │
│back│ │  stretches to bottom & right edges    │
│grnd│ └───────────────────────────────────────┘
└────┴─────────────────────────────────────────┘
```

### Detailed Changes

#### 1. New CSS Variables (src/index.css)

Add a `--surface` semantic variable to each theme block. This is the "card" color — slightly lighter than `--background` in dark themes, slightly different in light themes:

| Theme | `--surface` value |
|-------|-------------------|
| `:root` (light) | `0 0% 98%` (near-white, slightly off from pure white bg) |
| `.dark` | `225 6% 22%` (slightly lighter than `223 7% 20%` bg) |
| `.sado` | `36 50% 97%` |
| `.majls` | `23 47% 15%` (slightly lighter than `22 44% 8%` bg) |

Also add Tailwind config entry for `surface` color.

#### 2. AppLayout.tsx — Structural Wrapper

- Root div keeps `bg-background` (base layer).
- Title bar: remove any bottom border, keep `bg-background` (transparent to base).
- The `<main>` wrapper gets the new surface treatment:
  - `bg-surface rounded-tl-[16px] overflow-hidden` 
  - This wraps everything: HomeSidebar, ChannelSidebar, chat, members list.
  - No rounding on other corners — it bleeds to bottom/right edges.

#### 3. Server Rail (ServerRail.tsx)

- Change `bg-background` to `bg-transparent` (inherits the darker base).
- Remove any `border-e` or `border-r` if present (none currently, good).

#### 4. ChannelSidebar.tsx (line 582)

- Remove `bg-muted/70 backdrop-blur-sm border-e border-border/50` — the sidebar now lives inside the surface card, so it inherits `bg-surface` or uses a subtle `bg-muted/30` for distinction.
- Remove the right border since separation is now handled by the card surface.

#### 5. HomeSidebar.tsx (line 330)

- Same treatment: remove `border-e border-border/50 bg-muted/70 backdrop-blur-sm` and let it inherit from the surface card.

#### 6. ThemeContext.tsx — Color Theme Integration

- For gradient/solid color themes, map `--surface` from `--color-surface` (already provided in preset vars).
- Clear `--surface` in `COLOR_THEME_EXTRA_VARS` on theme reset.

#### 7. Tailwind Config (tailwind.config.ts)

- Add `surface` to `colors`:
  ```typescript
  surface: "hsl(var(--surface))",
  ```

### Files to Modify

| File | Change Summary |
|------|----------------|
| `src/index.css` | Add `--surface` variable to all 4 theme blocks |
| `tailwind.config.ts` | Add `surface` color mapping |
| `src/components/layout/AppLayout.tsx` | Wrap `<main>` with `bg-surface rounded-tl-[16px]`, strip title bar borders |
| `src/components/server/ServerRail.tsx` | `bg-background` stays (it IS the base layer) |
| `src/components/server/ChannelSidebar.tsx` | Remove glass bg/border from outer container |
| `src/components/layout/HomeSidebar.tsx` | Remove glass bg/border from outer container |
| `src/contexts/ThemeContext.tsx` | Map `--surface` from preset vars, add to cleanup list |
| `src/pages/ServerView.tsx` | No changes needed (layout is inherited) |
| `src/pages/HomeView.tsx` | No changes needed |

### What This Does NOT Change

- Mobile layout (Server Rail is rendered inline on mobile, different flow)
- Gradient/solid theme glassmorphism behavior (still works, surface becomes glass on gradient themes)
- Any chat composer, message list, or member list styling

