# Architecture

**Analysis Date:** 2026-02-26

## Pattern Overview

**Overall:** React + Context API for state management with direct Supabase integration via realtime subscriptions. Desktop-first with progressive mobile adaptation using React Router v6 (hash-based routing) and component-level responsive queries.

**Key Characteristics:**
- Direct Supabase client calls instead of React Query abstraction
- Real-time data sync via `supabase.channel()` with postgres_changes subscriptions
- Four-layer Context provider stack (Auth → Theme → Audio → Voice)
- Route-driven architecture with page-level components consuming hooks
- WebRTC peer-to-peer for voice/video with custom SDP optimization
- Mobile-responsive with `useIsMobile()` hook for layout switching

## Layers

**Presentation (UI):**
- Purpose: Render user interface with form inputs, lists, modals, chat
- Location: `src/components/` (subdivided by feature domain)
- Contains: React components using shadcn-ui primitives + Tailwind CSS
- Depends on: Contexts (AuthContext, VoiceChannelContext, etc.), hooks (usePresence, useWebRTC), Supabase client directly
- Used by: Page routes in `src/pages/`

**Page/Route Layer:**
- Purpose: Coordinate data fetching, subscriptions, and component composition per route
- Location: `src/pages/` (Auth.tsx, Chat.tsx, GroupChat.tsx, ServerView.tsx, FriendsDashboard.tsx, Settings.tsx, InviteJoin.tsx)
- Contains: Top-level page components that orchestrate features
- Depends on: Components, Contexts, hooks, Supabase client for direct queries and subscriptions
- Used by: React Router in `src/App.tsx`

**State Management (Context Providers):**
- Purpose: Global state for auth, theme, audio settings, voice channel management
- Location: `src/contexts/` (AuthContext.tsx, ThemeContext.tsx, AudioSettingsContext.tsx, VoiceChannelContext.tsx)
- Contains: React Context definitions, auth callbacks, status tracking
- Depends on: Supabase client (auth callbacks in AuthContext)
- Used by: All pages and components via hooks (useAuth(), useTheme(), useAudioSettings(), useVoiceChannel())

**Hooks (Business Logic):**
- Purpose: Encapsulate realtime subscriptions, presence tracking, WebRTC management, data fetching
- Location: `src/hooks/`
- Key hooks:
  - `useWebRTC()` - Voice/video call management with peer connection setup and media stream handling
  - `usePresence()` - User online status tracking via Supabase Presence API
  - `useMessageReactions()` - Message reaction subscription and updates
  - `useUnreadCount()`, `useUnreadDMs()` - Message notification counts
  - `useChannelUnread()` - Per-channel unread message tracking
  - `useServerVoiceActivity()` - Track active voice participants
  - `use-mobile()` - Responsive breakpoint detection
  - `use-toast()` - Toast notification management
- Depends on: Supabase client, Context hooks
- Used by: Page components

**Integration Layer:**
- Purpose: Supabase SDK configuration and generated database types
- Location: `src/integrations/supabase/`
- Contains:
  - `client.ts` - Singleton Supabase client with auth and realtime config
  - `types.ts` - Auto-generated TypeScript types from Supabase schema (do not edit manually)
- Depends on: Environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)
- Used by: All pages, hooks, components via `import { supabase } from "@/integrations/supabase/client"`

**Utilities & Libraries:**
- Purpose: Shared helper functions and utilities
- Location: `src/lib/`
- Key utilities:
  - `uploadChatFile.ts` - File upload to Supabase Storage with progress tracking (XMLHttpRequest for progress)
  - `soundManager.ts` - Audio notification playback (notifSound.mp3, ringtone.mp3)
  - `emojiUtils.ts` - Detect emoji-only messages, apply sizing
  - `renderLinkedText.tsx` - URL linkification in message text
  - `inviteUtils.ts` - Server invite code detection in messages
  - `unicodeFonts.ts` - Unicode font decoration conversion (Serif, Monospace, etc.)
  - `utils.ts` - `cn()` Tailwind class merging utility

**Internationalization:**
- Purpose: English and Arabic translation strings with per-user language preference
- Location: `src/i18n/`
- Contains: `en.ts` (English), `ar.ts` (Arabic), `index.ts` (i18next config)
- Pattern: Dot-notation keys (e.g., `myFeature.title`), loaded at app startup
- Used by: Components via `useTranslation()` hook

## Data Flow

**DM Chat Flow:**

1. **Page Load** → `Chat.tsx` mounts with `threadId` from URL params
2. **Auth Check** → `useAuth()` provides current user
3. **Profile Fetch** → Direct `supabase.from("profiles")` query for other user in thread
4. **Messages Load** → Paginated query: `supabase.from("messages").select("*").eq("thread_id", threadId).order("created_at").limit(30)`
5. **Subscribe to New Messages** →
   ```typescript
   supabase.channel(`chat-${threadId}`)
     .on("postgres_changes", {
       event: "INSERT",
       schema: "public",
       table: "messages",
       filter: `thread_id=eq.${threadId}`
     }, (payload) => setMessages(prev => [...prev, payload.new]))
     .subscribe()
   ```
6. **Subscriptions for Other Changes** →
   - Message edits (UPDATE events)
   - Message deletes (DELETE events)
   - Typing indicator updates via dedicated channel
   - Message reactions via `useMessageReactions()` hook
7. **Send Message** →
   ```typescript
   await supabase.from("messages").insert({
     thread_id: threadId,
     author_id: user.id,
     content: newMsg,
     created_at: new Date()
   })
   ```
   Realtime subscription triggers, message appears immediately
8. **Cleanup** → `useEffect` cleanup unsubscribes channel to prevent memory leaks

**Server Channel Chat Flow:**

1. **Page Load** → `ServerView.tsx` mounts with `serverId` and optional `channelId`
2. **Check Access** → For private channels, verify user in `channel_members` table
3. **Load Channels** → Query `channels` table filtered by `server_id`, show in `ChannelSidebar`
4. **Select Channel** → `ServerChannelChat.tsx` mounts with active channel
5. **Fetch Messages** → Same pattern as DM (paginated, subscribable)
6. **Subscribe to Channel Messages** →
   ```typescript
   supabase.channel(`server-channel-${channelId}`)
     .on("postgres_changes", {
       event: "*",
       schema: "public",
       table: "messages",
       filter: `channel_id=eq.${channelId}`
     }, ...)
     .subscribe()
   ```
7. **Mention Detection** → `MentionPopup.tsx` triggers on `@` character in input
8. **Voice Channel Join** → Set `VoiceChannelContext.voiceChannel`, trigger `useWebRTC()` setup
9. **Voice Participants** → Track via `voice_channel_participants` table subscription

**Voice Call Flow:**

1. **Outgoing Call** → `Chat.tsx` initiates via `useWebRTC()` hook with `isCaller: true`
2. **Create Call Record** → Insert into `call_sessions` table with `initiator_id` and `recipient_id`
3. **Notify Recipient** → Remote user's `CallListener.tsx` detects new call via subscription to `call_sessions`
4. **Recipient Accept** → Update call record status, both peers create RTCPeerConnection
5. **ICE Candidates Exchange** → Via Supabase channel (custom signaling):
   ```typescript
   supabase.channel(`call-signal-${sessionId}`)
     .on("postgres_changes", {...}, handleICECandidate)
     .subscribe()
   ```
6. **SDP Offer/Answer** → Optimized with `optimizeSDPForGaming()` (bitrate limits for gaming video)
7. **MediaStream Setup** → Local audio/video captured, remote stream displayed
8. **End Call** → Update call record, cleanup streams and peer connection

**State Management Flow:**

- **Auth State** → `AuthContext` holds session, user, profile; updates via `supabase.auth.onAuthStateChange()`
- **Theme State** → `ThemeContext` tracks light/dark mode, accent color, gradient presets
- **Audio Settings** → `AudioSettingsContext` tracks global mute/deafen state
- **Voice Channel** → `VoiceChannelContext` tracks active voice channel, screen/camera streams, peer state
- **Local Component State** → Page/component level useState for UI state (loading, editing, modals)

**Presence Flow:**

- User subscribes to `online-users` Presence channel
- `usePresence()` hook tracks presence state map and provides `isOnline(userId)` and `getUserStatus(profile)`
- Updates `last_seen` periodically (every 60s) in profiles table
- Status auto-expires after `status_until` timestamp

## Key Abstractions

**Page Component:**
- Purpose: Route handler that coordinates feature-specific data flow
- Examples: `src/pages/Chat.tsx`, `src/pages/GroupChat.tsx`, `src/pages/ServerView.tsx`
- Pattern: Mounts on route match, manages page-level state, delegates UI to presentation components
- Lifecycle: Load data → Subscribe to realtime → Render UI → Cleanup subscriptions

**Custom Hook (useWebRTC):**
- Purpose: Encapsulate WebRTC peer connection lifecycle
- Location: `src/hooks/useWebRTC.ts` (23KB, ~1000 LOC)
- Pattern: Returns tuple `[callState, isMuted, isDeafened, callDuration, ...streams, startCall, endCall]`
- Uses: RTCPeerConnection, MediaStream, Supabase channel for signaling
- Setup: SDP optimization, ICE candidate queuing, audio element pooling for multiple remote participants

**Realtime Subscription:**
- Purpose: Keep local state synced with database changes
- Pattern:
  ```typescript
  useEffect(() => {
    const channel = supabase.channel(`unique-name-${id}`)
      .on("postgres_changes", { event, schema, table, filter }, (payload) => {
        // Update state with payload.new or payload.old
      })
      .subscribe();
    return () => channel.unsubscribe();
  }, [id]);
  ```
- Cleanup: **Essential** — every subscription must unsubscribe in useEffect cleanup

**File Upload:**
- Purpose: Upload chat files to Supabase Storage with progress feedback
- Location: `src/lib/uploadChatFile.ts`
- Pattern: XMLHttpRequest for progress events, Bearer token auth, returns public URL
- Buckets: `chat-files` (user/timestamp_filename structure)

**Context Consumer Pattern:**
```typescript
const { user, profile, loading } = useAuth();
const { theme, setTheme } = useTheme();
const { voiceChannel, setVoiceChannel } = useVoiceChannel();
```

## Entry Points

**Application Root:**
- Location: `src/App.tsx`
- Triggers: On app start
- Responsibilities:
  - Define provider stack order (QueryClientProvider → ThemeProvider → AudioSettingsProvider → VoiceChannelProvider → AuthProvider)
  - Set up React Router with hash-based routing
  - Render error boundary and toast containers
  - Handle Electron deep links and update notifications

**Page Routes:**
- Location: `src/pages/` files
- Triggers: On hash route change
- Responsibilities:
  - Load route-specific data
  - Set up realtime subscriptions
  - Delegate UI rendering to component hierarchy

**Protected Routes:**
- Pattern: Wrapper component checks `useAuth().user` and loading state
- Redirects unauthenticated users to `/auth`
- Shows loading spinner during session restoration

**Authentication Entry:**
- Location: `src/pages/Auth.tsx`
- Unprotected route
- Handles sign up, sign in, password reset with email validation

## Error Handling

**Strategy:** Catch at component level, surface via toast notifications and error boundaries

**Patterns:**

1. **Try/Catch in async handlers:**
   ```typescript
   try {
     await supabase.from("messages").insert({...});
   } catch (error) {
     toast.error(t("errors.messageSendFailed"));
   }
   ```

2. **Error Boundary (class component):**
   - Location: `src/components/ErrorBoundary.tsx`
   - Catches render-time errors, displays fallback UI
   - Offers "Reload App" button

3. **Global error traps in main.tsx:**
   - `window.onerror` — Catches uncaught errors
   - `unhandledrejection` event — Catches unhandled promise rejections
   - Both log to console

4. **Supabase RLS errors:**
   - Row-level security policies prevent unauthorized access
   - Client receives error from `.select()`, `.insert()`, etc.
   - Wrapped in try/catch, surface as toast

## Cross-Cutting Concerns

**Logging:** Console logging for debugging (no external service)
- Global error traps log to console
- Component lifecycle logged in development
- WebRTC stats logged via `statsIntervalRef` in useWebRTC

**Validation:**
- Client-side: react-hook-form + Zod (in Auth page)
- Server-side: Supabase RLS policies enforce access control
- No duplication of auth/permission logic client-side

**Authentication:**
- Provider: Supabase Auth (email/password)
- Token storage: localStorage (via Supabase SDK config)
- Auto-refresh: Enabled (`autoRefreshToken: true`)
- Context layer exposes `useAuth()` for all components
- Username-to-email resolution via RPC in sign-in

**Internationalization:**
- Triggered by: Language preference in settings or localStorage
- Applied to: HTML direction (`dir="rtl"` for Arabic), all UI strings
- No special RTL-specific components — Tailwind + HTML handle layout flipping

**Real-time Subscriptions:**
- Enabled tables: Any table in `ALTER PUBLICATION supabase_realtime ADD TABLE` migration
- Performance: Filtered subscriptions (e.g., `filter: thread_id=eq.${id}`) reduce message volume
- Reliability: Unsubscribe in useEffect cleanup prevents leaks and ghost listeners

---

*Architecture analysis: 2026-02-26*
