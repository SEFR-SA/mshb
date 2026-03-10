## Server Boost Page — Implementation Plan

### Overview

Replace the small `ServerBoostModal` with a full-page, immersive boost experience at `/server/:serverId/boost`, inspired by the Discord reference screenshot.

---

### Step 1: Create `src/pages/ServerBoostPage.tsx`

A new page component that:

- Reads `serverId` from `useParams`, fetches server data (name, avatar, boost_count, boost_level) and the current user's personal boost count for that server from `user_boosts`
- Uses `useNavigate` for the back button and `useAuth` for the current user

**Sections inside the page (single scrollable container):**

**A. Hero Section**

- Animated background orbs using absolute-positioned divs with `blur-[120px]` and purple/pink gradient colors
- Centered server avatar + server name
- Pill badge: "🔮 X Boosts"
- Muted line: "(You've Boosted this server X times!)"
- Large bold heading: "BOOST THIS SERVER & UNLOCK PERKS FOR EVERYONE"
- Two buttons: primary gradient "Boost This Server" (with `ref` for IntersectionObserver), outline "Gift Mshb Pro"

**B. Level Cards (3-column, stacks on mobile)**

- A continuous horizontal progress line across the top of all 3 cards
- Circular gem badges at each card's top-left intersecting the line
- Dynamic coloring: if `boostCount >= threshold`, the circle + line segment lights up with `bg-primary`; otherwise `bg-muted`
- Glassmorphic cards (`bg-card/50 backdrop-blur-md border border-border/40 rounded-xl`)
- Card content per the spec (Level 1: 2 boosts, Level 2: 7 boosts, Level 3: 14 boosts) with specific perks listed

**C. Comparison Table**

- Title: "Uplevel this server with the best perks"
- Responsive grid/table with columns: Perks, Unboosted, Level 1, Level 2, Level 3
- Level 2 column highlighted with a pink/primary border and "RECOMMENDED" badge
- Rows: Emoji Slots, Sticker Slots, Soundboard Slots, Stream Quality, Audio Quality, Upload Size Limit, Video Stage Seats, Animated Server Icon, Server Invite Background, Server Banner, Custom Role Icons, Custom Invite Link
- Values use numbers or `<Check />`/`<X />` icons from lucide-react

**E. Floating Sticky Action Bar**

- `IntersectionObserver` on the hero "Boost This Server" button ref
- When that button scrolls out of view, a `fixed bottom-0` bar slides up with server avatar, server name, and "Boost This Server" button
- Uses `backdrop-blur-xl bg-background/90 border-t`

---

### Step 2: Route in `App.tsx`

Add inside the protected `<Route path="/">` block, alongside existing server routes:

```
<Route path="server/:serverId/boost" element={<ServerBoostPage />} />
```

---

### Step 3: Update `ServerRail.tsx` Context Menu

Change the "Boost Server" context menu item (line ~513) from opening `setBoostModal(...)` to `navigate(`/server/${s.id}/boost`)`. Remove the `ServerBoostModal` component and its state from `ServerRail.tsx`.

---

### Step 4: i18n additions in `en.ts` and `ar.ts`

Add new keys under `serverBoost` for the new page content (hero title, comparison table headers, recognition cards, etc.).

---

### Files to modify

- **Create**: `src/pages/ServerBoostPage.tsx` — the full-page component
- **Edit**: `src/App.tsx` — add route (line ~211)
- **Edit**: `src/components/server/ServerRail.tsx` — replace modal open with navigate, remove modal
- **Edit**: `src/i18n/en.ts` — add new i18n keys
- **Edit**: `src/i18n/ar.ts` — add Arabic translations for new keys