```markdown
# CLAUDE.md — MSHB Project Guide

## Project Purpose

MSHB is a **real-time communication platform** (Discord/Telegram-style) built as a web app, electron app for desktop and PWA. It is mainly an Electron application, and PWA. Core features:

- **Direct messaging** — 1-on-1 DM threads
- **Group chat** — multi-user conversations with roles
- **Servers & channels** — community hubs with text/voice channels
- **Voice & video calling** — WebRTC peer-to-peer with screen sharing
- **Rich messaging** — file attachments, emoji reactions, GIFs, stickers, replies, message pinning
- **Social graph** — friend requests, blocking, presence/status tracking
- **Internationalization** — English and Arabic (RTL) with per-user language preference

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 + TypeScript (Vite) |
| Styling | Tailwind CSS + shadcn-ui (Radix UI) |
| Backend | Supabase (PostgreSQL + Realtime + Auth + Storage) |
| Real-time | Supabase Realtime (`postgres_changes` subscriptions) |
| Calling | WebRTC (custom `useWebRTC` hook) |
| Presence | Supabase Presence channels |
| i18n | i18next + react-i18next |
| Forms | react-hook-form + Zod |
| State | React Context API + direct Supabase calls |
| Routing | React Router v6 |

**Note:** React Query is installed but **not actively used**. Data fetching uses direct `supabase` client calls inside `useEffect` + `useState`.

---

## Project Structure


```

src/
├── App.tsx                    # Root: routing tree + provider stack
├── pages/                     # Route-level components
│   ├── Auth.tsx               # Login / signup / password reset
│   ├── Chat.tsx               # 1-on-1 DM view
│   ├── GroupChat.tsx          # Group chat view
│   ├── ServerView.tsx         # Server hub (channel list + chat area)
│   ├── FriendsDashboard.tsx   # Friends management
│   ├── Settings.tsx           # User profile & preferences
│   └── InviteJoin.tsx         # Server invite acceptance
├── components/
│   ├── chat/                  # DM/group chat UI components
│   ├── server/                # Server/channel UI components
│   ├── layout/                # AppLayout, HomeSidebar
│   └── ui/                    # shadcn-ui primitives (don't edit)
├── contexts/
│   ├── AuthContext.tsx        # Session, user, profile — useAuth()
│   ├── ThemeContext.tsx       # Light/dark/custom theme — useTheme()
│   ├── VoiceChannelContext.tsx # Voice channel state + WebRTC
│   └── AudioSettingsContext.tsx# Global mute/deafen — useAudioSettings()
├── hooks/                     # Custom hooks (usePresence, useWebRTC, etc.)
├── integrations/supabase/
│   ├── client.ts              # Supabase client singleton
│   └── types.ts               # Auto-generated DB types (do not edit manually)
├── lib/
│   ├── utils.ts               # cn() — Tailwind class merging
│   ├── uploadChatFile.ts      # File upload to Supabase Storage
│   ├── soundManager.ts        # Audio notification playback
│   ├── emojiUtils.ts          # Emoji-only detection & sizing
│   └── unicodeFonts.ts        # Unicode decorative font conversion
└── i18n/
├── en.ts                  # English translations
├── ar.ts                  # Arabic translations
└── index.ts               # i18next configuration

```

---

## Key Architecture Decisions

### Monetization & Mshb Pro (CRITICAL)
- **Pro-Only by Default:** Treat all newly requested features as **exclusive to Mshb Pro** plan holders unless explicitly instructed otherwise by the user. 
- **Graceful Degradation:** Do NOT completely hide premium features from free users. Instead, display them in the UI with a "Lock" icon, a "PRO" badge, or `opacity-50`.
- **UI Locks & Toasts:** If a free user attempts to interact with a Pro feature, block the action and show a UI toast (e.g., "Requires Mshb Pro. Upgrade to unlock this feature.").
- **Validation:** Always verify the user's status via `profile?.is_pro` (accessible through `useAuth()`) before executing premium logic or rendering premium modals.

### Data Fetching
Supabase is called **directly** inside components and hooks — no React Query wrappers. Pattern:

```typescript
const [data, setData] = useState<MyType[]>([]);

useEffect(() => {
  supabase.from("table").select("*").eq("user_id", user.id).then(({ data }) => {
    if (data) setData(data);
  });
}, [user.id]);

```

### Real-time Updates

All live data (messages, presence, reactions) is driven by **Supabase Realtime** subscriptions:

```typescript
useEffect(() => {
  const channel = supabase
    .channel(`unique-channel-name-${id}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${id}` }, (payload) => {
      setMessages(prev => [...prev, payload.new as Message]);
    })
    .subscribe();
  return () => { channel.unsubscribe(); }; // ALWAYS clean up
}, [id]);

```

For a table to emit realtime events, it must be added in a migration:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.your_table;

```

### Global State

Four Context providers (order in `App.tsx` matters):

1. `QueryClientProvider` → `ThemeProvider` → `AudioSettingsProvider` → `VoiceChannelProvider` → `AuthProvider`

Access them via their exported hooks: `useAuth()`, `useTheme()`, `useAudioSettings()`, `useVoiceChannel()`.

### Security

* **RLS (Row-Level Security)** is enabled on all tables. Never disable it, never write client-side bypass logic.
* All access control logic lives in SQL policies in `supabase/migrations/`.

### TypeScript

The config is **lenient** (`strict: false`, `noImplicitAny: false`). Use `as any` when Supabase's generated types don't match a query (common for RPC calls and complex joins). Don't fight the types excessively.

### Path Alias

Always use `@/` for imports — it maps to `src/`:

```typescript
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

```

---

## Coding Conventions

### Components

```typescript
// PascalCase filename, Props interface at top, default export at bottom
interface Props {
  threadId: string;
  onClose?: () => void;
}

const MyComponent = ({ threadId, onClose }: Props) => {
  // ...
  return <div />;
};

export default MyComponent;

```

### Hooks

```typescript
// use prefix, return an object
export const useMyHook = (id: string) => {
  const [value, setValue] = useState<string>("");
  // ...
  return { value, setValue };
};

```

### Database Types

```typescript
import type { Tables } from "@/integrations/supabase/types";
type Profile = Tables<"profiles">;
type Message = Tables<"messages">;

```

### CSS / Styling

```typescript
import { cn } from "@/lib/utils";

<div className={cn("base-class", isActive && "active-class", className)} />

```

### Translations

Every user-visible string must have entries in **both** `src/i18n/en.ts` and `src/i18n/ar.ts`:

```typescript
// en.ts
myFeature: { title: "My Feature", action: "Do Thing" }

// In component:
const { t } = useTranslation();
<h1>{t("myFeature.title")}</h1>

```

### Array Dependencies

When an array is used as a `useEffect` dependency, use `.join(",")` to prevent infinite loops:

```typescript
useEffect(() => { /* ... */ }, [messageIds.join(",")]);

```

### SENIOR DEV MANDATE: ANTI-OVER-ENGINEERING
- **Zero-Bloat Policy:** Never write a 50-line custom function or complex `for-loop` when a 2-line native JavaScript/React method exists.
- **Native First:** Always prioritize built-in array methods (`.map()`, `.filter()`, `.reduce()`), standard React hooks, and modern ES6+ features over manual logic.
- **Simplicity over Abstraction:** Do not invent "micro-frameworks", unnecessary wrapper functions, or complex architectural patterns for simple UI or data transformations.
- **The "Senior Check":** Before proposing any code changes, audit your own logic. Ask yourself: *"Is this the absolute most concise, readable way to achieve this?"* If your diff adds 80 lines for a simple feature, delete it and rewrite the elegant, 2-line solution.

### SENIOR DEV MANDATE: SINGLE SOURCE OF TRUTH (CRITICAL)
Before rendering any user-visible data, always ask: **"Will this be displayed in more than one place?"** If yes, use the canonical shared component — never duplicate inline rendering logic.

**Mandatory shared components — use them everywhere, no exceptions:**

| Feature | Component | Required Props (from DB profile) |
|---------|-----------|----------------------------------|
| Display name with styling | `StyledDisplayName` from `@/components/StyledDisplayName` | `displayName`, `fontStyle={p.name_font}`, `effect={p.name_effect}`, `gradientStart={p.name_gradient_start}`, `gradientEnd={p.name_gradient_end}` |
| Avatar decoration frame | `AvatarDecorationWrapper` from `@/components/shared/AvatarDecorationWrapper` | `decorationUrl`, `isPro`, `size` (px integer) |
| Nameplate background | `NameplateWrapper` from `@/components/shared/NameplateWrapper` | `nameplateUrl`, `isPro` |
| Profile effect overlay | `ProfileEffectWrapper` from `@/components/shared/ProfileEffectWrapper` | `effectUrl`, `isPro` |

**StyledDisplayName — mandatory Supabase select fields:**
Any profile fetch that renders a styled name MUST include all 4 fields:
```
name_font, name_effect, name_gradient_start, name_gradient_end
```
If the query uses `select("*")` these are already included. If it lists fields explicitly, you MUST add all 4. Omitting even one silently breaks font or color effects for users who have set them.

**Common mistake to avoid:** Using `StyledDisplayName` but only passing `gradientStart`/`gradientEnd` while omitting `fontStyle` and `effect` — this breaks custom fonts and neon/toon/pop effects while appearing correct for gradient-only users.

---

## Adding a New Feature

1. **Write a migration** in `supabase/migrations/` (filename: timestamp + description):
```sql
ALTER TABLE public.messages ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT false;
ALTER PUBLICATION supabase_realtime ADD TABLE public.new_table; -- if new table

```


2. **Add/update RLS policies** in the same migration file.
3. **Reference types** via `Tables<"table_name">` — no manual type editing needed.
4. **Build the component** in the appropriate `src/components/` subdirectory (chat/, server/, layout/).
5. **Create a page** in `src/pages/` only if it needs its own route.
6. **Add the route** to `src/App.tsx`:
```typescript
// Protected, nested under AppLayout:
<Route path="/my-page" element={<MyPage />} />

// Protected, standalone:
<Route path="/my-page" element={<ProtectedRoute><MyPage /></ProtectedRoute>} />

```


7. **Set up realtime** with proper cleanup (see pattern above).
8. **Enforce Pro Locks:** Ensure the new feature is locked behind the `profile?.is_pro` check. Implement UI visual locks (badges/lock icons) and display an upgrade toast if a free user attempts to access it.
9. **Add translations** to both `en.ts` and `ar.ts`.
10. **Test mobile** using the `useIsMobile()` hook for responsive layout adjustments.

### Mobile-First & Responsive Design

All new UI components must be mobile-responsive by default. AI agents must follow these rules:

1. **Tailwind Mobile-First:** Base utility classes must target mobile screens. Use breakpoints (`md:`, `lg:`, `xl:`) to scale up to desktop interfaces. Do NOT write desktop-first CSS.
2. **The `use-mobile` Hook:** Use the provided `useIsMobile()` hook (from `src/hooks/use-mobile.tsx`) to conditionally render heavy components or switch behaviors (e.g., switching from a Sidebar to a Bottom Nav/Sheet).
3. **Modals vs. Sheets:** For complex menus or filters, prefer `Dialog` on desktop, but use `Sheet` or `Drawer` from shadcn-ui on mobile screens for better UX.
4. **Touch Targets:** Ensure interactive elements (buttons, links, icons) have adequate padding (at least `p-2` or `h-10 w-10`) to accommodate mobile touch targets.
5. **Horizontal Scrolling:** Always prevent hidden horizontal overflow on mobile screens (`overflow-x-hidden` on main containers) unless explicitly building a swipeable carousel.

---

## Adding a New Color Theme

When the user provides a CSS variable palette and asks to add a new color theme, **execute immediately** — no planning step required.

### The Only File to Edit

`src/contexts/ThemeContext.tsx` — add one object to the `COLOR_THEME_PRESETS` array.

- `AppearanceTab.tsx` auto-renders all presets — **no changes needed**
- `src/index.css` is **not touched** — color themes are applied via JavaScript, not CSS classes
- No i18n changes needed

### Rule 1 — Identify the Type First

| User provides | Type | `solid` flag | `colors` array |
|---|---|---|---|
| Solid hex codes only | Solid | `solid: true` | Single entry: `["#bg_hex"]` |
| `linear-gradient(...)` | Gradient | omit | 2-3 gradient stop hexes |

### Rule 2 — Solid Theme Protocol

**Do NOT invent gradients from solid hex codes.** Set `colors` to a single hex entry:
- `colors: ["#bg_hex"]` → `buildGradient()` returns the plain hex (solid CSS background) ✓
- `solid: true` → ThemeContext adds `.solid-theme-active` to `<html>`, skips glassmorphism — panels become fully opaque

### Rule 3 — Gradient Theme Protocol

Use 2-3 hex stops that represent the palette visually. **`colors[0]` MUST equal the primary background hex** — ThemeContext maps `colors[0]` to `--background` (component surfaces).

### Rule 4 — Skeleton & Loading Contrast

Ensure `--color-bg-muted` is visibly distinct from `--color-bg`. The app uses `--muted` (= `--color-bg-muted`) for skeleton loading states. If they are identical or too similar, the shimmer pulse will be invisible. The `--skeleton-highlight` CSS variable is automatically set to the theme's `primary` color by ThemeContext — do **not** set it manually; it is always cleared on theme switch.

### Preset Object Shape

```typescript
{
  id: "snake_case_id",      // unique identifier
  name: "Display Name",     // shown in Appearance Settings UI
  colors: ["#bg_hex"],      // solid: single entry; gradient: 2-3 hex stops
  primary: "#hex",          // accent color → --primary, --ring, sidebar highlights, --skeleton-highlight
  solid: true,              // ONLY for solid-background themes (omit for gradients)
  vars: {
    "--color-bg":              "#hex",          // solid hex for solid themes; linear-gradient(...) for gradients
    "--color-bg-muted":        "#hex",          // MUST differ from --color-bg for visible skeletons
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

### Placement Groups

| Group | When to use |
|-------|-------------|
| Light / Pastel | Light backgrounds, soft tones |
| Vibrant / Synthwave | Neon + dark backgrounds |
| Deep / Elegant Dark | Rich dark, jewel tones |

### What Happens Automatically

- `.solid-theme-active` on `<html>` → CSS overrides make all panels fully opaque (`index.css`)
- `.gradient-active` on `<html>` → CSS enables glassmorphism (30% opacity + backdrop-blur)
- `--skeleton-highlight` set to `primary` HSL → skeleton shimmer pulses to primary color
- All non-default presets are Pro-gated automatically — no extra code needed
- **Omit** non-standard vars (e.g. `--color-accent-gold`) — they are not in the cleanup list and leak to other themes on switch

---

## Adding a New SVG Badge

When the user provides a raw SVG component and asks to add it as a badge, **execute immediately** — no planning step required.

### The 3 Files to Edit

1. **Create** `src/components/ui/badges/<BadgeName>Badge.tsx`
   — Paste the user's code. Fix any malformed `xmlns` (markdown hyperlink format is invalid SVG).
   — Component interface must be: `{ color: string; className?: string }`
   — Use `fill="currentColor"` for the dynamic-color path; `style={{ color }}` on the `<svg>` element.

2. **`src/components/ServerTagBadgeIcon.tsx`** — Add to `CUSTOM_BADGE_COMPONENTS` (not the LUCIDE map):
   ```typescript
   const CUSTOM_BADGE_COMPONENTS: Record<string, CustomBadgeComponent> = {
     orb: OrbBadge,
     myNewBadge: MyNewBadge,  // ← add here
   };
   ```

3. **`src/components/server/settings/ServerTagTab.tsx`** — Import the component, add to `BADGE_OPTIONS` with `custom: true`:
   ```typescript
   { id: "myNewBadge", Icon: MyNewBadge, label: "My Badge", custom: true },
   ```

### What NOT to Change
- No migration needed (badge ID is just a string stored in `server_tag_badge`)
- No i18n changes needed — badge labels are hardcoded in `BADGE_OPTIONS`
- Do not edit the badge component's SVG paths — paste as-is from the user

### Why `custom: true`?
Lucide icon placeholders use `style={{ color }}` (CSS `currentColor` inheritance).
Custom SVG components use a `color` prop directly (they set their own `style={{ color }}`).
The `custom: true` flag tells the badge grid render to pass `color` as a prop instead of `style`.

### xmlns Bug to Always Fix
Markdown often corrupts the SVG `xmlns` attribute into a hyperlink format:
```
xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)"  ← INVALID
```
Always fix to:
```
xmlns="http://www.w3.org/2000/svg"  ← CORRECT
```

---

## Debugging Common Issues

| Problem | Where to look |
| --- | --- |
| Auth / sign-in fails | `AuthContext.tsx` — `signIn` resolves usernames to emails via a Supabase RPC call |
| Realtime subscription not firing | Check the migration added the table to `supabase_realtime` publication |
| Subscription fires but UI doesn't update | Ensure state setter is called correctly; watch for stale closures in handlers |
| Subscription memory leak | Every `supabase.channel()` must have `return () => channel.unsubscribe()` in the cleanup |
| Presence not tracking | See `usePresence.ts` — uses Supabase Presence API, not `postgres_changes` |
| DB type errors on query | Cast with `as any` for RPC calls and complex queries that outpace the generated types |
| Status not resetting | `AuthContext` checks `status_until` on load and resets expired statuses |
| File upload failing | Check Supabase Storage bucket policies; `uploadChatFile()` in `src/lib/uploadChatFile.ts` |
| Images/assets broken in Electron | **Never use absolute paths (`/image.png`, `/placeholder.svg`) for static assets.** Electron runs on a `file://` origin where `/foo.png` resolves to the filesystem root, not the app's `public/` folder. Use: (1) imported assets via `import img from "@/assets/image.png"` (Vite resolves these correctly in all contexts), (2) fully-qualified external CDN URLs (`https://…`), or (3) inline SVG / data URIs. Always add an `onError` fallback on `<img>` tags to degrade gracefully. |

---

## Key Files Quick Reference

| File | Purpose |
| --- | --- |
| [src/App.tsx](https://www.google.com/search?q=src/App.tsx) | Routing tree and provider stack |
| [src/contexts/AuthContext.tsx](https://www.google.com/search?q=src/contexts/AuthContext.tsx) | Auth state, session, profile — `useAuth()` |
| [src/integrations/supabase/client.ts](https://www.google.com/search?q=src/integrations/supabase/client.ts) | Supabase client singleton |
| [src/integrations/supabase/types.ts](https://www.google.com/search?q=src/integrations/supabase/types.ts) | Auto-generated DB types |
| [src/i18n/en.ts](https://www.google.com/search?q=src/i18n/en.ts) | English translations |
| [src/i18n/ar.ts](https://www.google.com/search?q=src/i18n/ar.ts) | Arabic translations |
| [src/lib/utils.ts](https://www.google.com/search?q=src/lib/utils.ts) | `cn()` for Tailwind class merging |
| [src/lib/uploadChatFile.ts](https://www.google.com/search?q=src/lib/uploadChatFile.ts) | File upload with progress tracking |
| [src/lib/soundManager.ts](https://www.google.com/search?q=src/lib/soundManager.ts) | Audio playback for notifications/calls |
| [src/hooks/usePresence.ts](https://www.google.com/search?q=src/hooks/usePresence.ts) | Online presence and user status |
| [src/hooks/useWebRTC.ts](https://www.google.com/search?q=src/hooks/useWebRTC.ts) | Voice/video call management |
| [supabase/migrations/](https://www.google.com/search?q=supabase/migrations/) | All database schema changes |

---

## Premium Assets (Curated — No User Uploads)

All premium cosmetic assets are **curated by the admin** and stored as hardcoded arrays in config files. Users select from the library — they **cannot** upload their own. All three asset types are **Pro-gated** automatically.

### How to Add New Assets

| Asset Type | Config File | Object Shape | Recommended Dimensions |
|---|---|---|---|
| Avatar Decorations | `src/lib/decorations.ts` | `{ id, name, url, animated? }` | **128 × 128 px** (or 256 × 256 px @2×). Square, transparent PNG/APNG/WebP. The frame is rendered ~25% larger than the avatar it wraps. |
| Nameplates | `src/lib/nameplates.ts` | `{ id, name, url, animated? }` | **600 × 80 px** (or 1200 × 160 px @2×). Wide banner, used as identity-row backgrounds. |
| Profile Effects | `src/lib/profileEffects.ts` | `{ id, name, url, animated? }` | **440 × 580 px** (or 880 × 1160 px @2×). Portrait orientation, transparent APNG/WebP, overlays the full profile card. |

### Steps to Add a New Asset

1. Export your design as **APNG or WebP** (never GIF). Use transparent backgrounds for Decorations and Effects.
2. Host the file (e.g., Supabase Storage, CDN) and copy the public URL.
3. Open the corresponding config file (see table above).
4. Add a new `{ id: "snake_case_id", name: "Display Name", url: "https://...", animated: true }` entry to the exported array.
5. Save — the UI selectors will pick it up automatically. No component code changes needed.

### Wrapper Components

| Component | Purpose | Used In |
|---|---|---|
| `AvatarDecorationWrapper` | Frames avatars at z-10 (25% oversized) | 14 locations (member lists, sidebars, panels, calls) |
| `NameplateWrapper` | Background image behind identity rows | Member lists, DM sidebar, friends, settings |
| `ProfileEffectWrapper` | Full-card animated overlay at z-50 | `UserProfileModal`, `UserProfilePanel` |

### Database Columns (profiles table)

- `avatar_decoration_url` — selected decoration URL
- `nameplate_url` — selected nameplate URL
- `profile_effect_url` — selected profile effect URL

```

```