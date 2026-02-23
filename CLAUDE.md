# CLAUDE.md — MSHB Project Guide

## Project Purpose

MSHB is a **real-time communication platform** (Discord/Telegram-style) built as a web app and PWA. Core features:

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
│   ├── AuthContext.tsx         # Session, user, profile — useAuth()
│   ├── ThemeContext.tsx        # Light/dark/custom theme — useTheme()
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
- **RLS (Row-Level Security)** is enabled on all tables. Never disable it, never write client-side bypass logic.
- All access control logic lives in SQL policies in `supabase/migrations/`.

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

8. **Add translations** to both `en.ts` and `ar.ts`.

9. **Test mobile** using the `useIsMobile()` hook for responsive layout adjustments.

---

## Debugging Common Issues

| Problem | Where to look |
|---------|--------------|
| Auth / sign-in fails | `AuthContext.tsx` — `signIn` resolves usernames to emails via a Supabase RPC call |
| Realtime subscription not firing | Check the migration added the table to `supabase_realtime` publication |
| Subscription fires but UI doesn't update | Ensure state setter is called correctly; watch for stale closures in handlers |
| Subscription memory leak | Every `supabase.channel()` must have `return () => channel.unsubscribe()` in the cleanup |
| Presence not tracking | See `usePresence.ts` — uses Supabase Presence API, not `postgres_changes` |
| DB type errors on query | Cast with `as any` for RPC calls and complex queries that outpace the generated types |
| Status not resetting | `AuthContext` checks `status_until` on load and resets expired statuses |
| File upload failing | Check Supabase Storage bucket policies; `uploadChatFile()` in `src/lib/uploadChatFile.ts` |

---

## Key Files Quick Reference

| File | Purpose |
|------|---------|
| [src/App.tsx](src/App.tsx) | Routing tree and provider stack |
| [src/contexts/AuthContext.tsx](src/contexts/AuthContext.tsx) | Auth state, session, profile — `useAuth()` |
| [src/integrations/supabase/client.ts](src/integrations/supabase/client.ts) | Supabase client singleton |
| [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts) | Auto-generated DB types |
| [src/i18n/en.ts](src/i18n/en.ts) | English translations |
| [src/i18n/ar.ts](src/i18n/ar.ts) | Arabic translations |
| [src/lib/utils.ts](src/lib/utils.ts) | `cn()` for Tailwind class merging |
| [src/lib/uploadChatFile.ts](src/lib/uploadChatFile.ts) | File upload with progress tracking |
| [src/lib/soundManager.ts](src/lib/soundManager.ts) | Audio playback for notifications/calls |
| [src/hooks/usePresence.ts](src/hooks/usePresence.ts) | Online presence and user status |
| [src/hooks/useWebRTC.ts](src/hooks/useWebRTC.ts) | Voice/video call management |
| [supabase/migrations/](supabase/migrations/) | All database schema changes |
