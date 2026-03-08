# Adding Server Tags & Badges

Server tags are small labeled badges displayed next to server names (in the channel sidebar header) and next to member display names. Each server has one tag with a name, color, and an optional badge icon.

---

## Badge Icon Asset Specs

| Property | Value |
|----------|-------|
| Dimensions | **16 × 16 px** (or 32 × 32 px @2×) |
| Format | **SVG** (vector — scales to any size) |
| Color | Dynamic via `color` prop — use `fill="currentColor"` |

---

## Tag Components

| Part | Description |
|------|-------------|
| `server_tag_name` | Short text label (shown truncated to 4 chars in sidebar) |
| `server_tag_badge` | Badge icon ID (matches a key in `BADGE_OPTIONS`) |
| `server_tag_color` | Hex color for the badge icon and text |
| `server_tag_container_color` | Hex color for the pill background (optional, falls back to `server_tag_color`) |

---

## Adding a New Badge Icon (SVG)

Badge icons are custom SVG components registered in two files.

### Step 1 — Create the badge component

Create `src/components/ui/badges/<BadgeName>Badge.tsx`:

```tsx
import React from "react";

interface Props { color: string; className?: string; }

const MyBadge = ({ color, className }: Props) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style={{ color }} className={className}>
    {/* paste SVG paths here — use fill="currentColor" for dynamic color */}
    <path fill="currentColor" d="..." />
  </svg>
);

export default MyBadge;
```

> **xmlns fix:** Markdown/editors sometimes corrupt `xmlns` into `[url](url)` format. Always use the plain string: `xmlns="http://www.w3.org/2000/svg"`

### Step 2 — Register in ServerTagBadgeIcon

Edit `src/components/ServerTagBadgeIcon.tsx` — add to `CUSTOM_BADGE_COMPONENTS`:

```typescript
import MyBadge from "@/components/ui/badges/MyBadge";

const CUSTOM_BADGE_COMPONENTS: Record<string, CustomBadgeComponent> = {
  orb: OrbBadge,
  myBadge: MyBadge,  // ← add here
};
```

### Step 3 — Register in ServerTagTab

Edit `src/components/server/settings/ServerTagTab.tsx` — add to `BADGE_OPTIONS`:

```typescript
import MyBadge from "@/components/ui/badges/MyBadge";

const BADGE_OPTIONS = [
  // ... existing badges ...
  { id: "myBadge", Icon: MyBadge, label: "My Badge", custom: true },
];
```

`custom: true` means the grid passes `color` as a prop (for custom SVGs). Lucide icons omit `custom` and receive color via CSS `currentColor`.

### No DB migration needed

The badge ID is a plain string stored in `servers.server_tag_badge`. No schema change required for new badge icons.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/components/ServerTagBadgeIcon.tsx` | Badge icon renderer — maps ID → component |
| `src/components/server/settings/ServerTagTab.tsx` | Badge picker UI in Server Settings |
| `src/components/ui/badges/` | Directory for all badge SVG components |
