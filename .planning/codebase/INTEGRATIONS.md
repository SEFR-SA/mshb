# External Integrations

**Analysis Date:** 2026-02-26

## APIs & External Services

**GIPHY:**
- Service: Animated GIF and sticker search/trending API
- What it's used for: GIF picker and sticker picker in chat message composer
- SDK/Client: Direct `fetch()` calls to GIPHY API via Supabase edge function proxy
- Auth: `GIPHY_API_KEY` environment variable (server-side only, not exposed to client)
- Proxy function: `supabase/functions/giphy-proxy/index.ts` - Deno-based edge function that proxies requests and maps GIPHY responses to simplified format
- Implementation: `src/components/chat/GifPicker.tsx` and `src/components/chat/StickerPicker.tsx` call Supabase function at `${VITE_SUPABASE_URL}/functions/v1/giphy-proxy?type=gifs&q=...`
- Caching: Trending results cached locally; search results fetched on-demand with 400ms debounce
- Rating: All API calls use `rating=pg-13` filter

## Data Storage

**Primary Database:**
- Provider: Supabase (PostgreSQL)
- Connection: `src/integrations/supabase/client.ts` - Singleton client initialized with `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- Client: `@supabase/supabase-js` v2.95.3
- Auth: Per-user RLS (Row-Level Security) policies enforced via Supabase Auth
- Auto-generated types: `src/integrations/supabase/types.ts` (do NOT edit manually)
- Session storage: localStorage (configured in client creation)

**Tables:**
- `auth.users` - Supabase Auth user records (managed by Supabase)
- `public.profiles` - User profile data (username, display_name, avatar_url, status, language, theme)
- `public.dm_threads` - Direct message threads (1-on-1 conversations)
- `public.group_chats` - Group chat conversations (3+ participants)
- `public.messages` - All messages (DM and group) with rich media support
- `public.message_reactions` - Emoji reactions on messages
- `public.friendships` - Friend request state (pending, accepted, blocked)
- `public.servers` - Community servers
- `public.channels` - Text/voice channels within servers
- `public.server_members` - Server membership with roles
- `public.voice_sessions` - Active voice call tracking
- `public.thread_read_status` - Per-user read markers for DM threads
- `public.announcement_channels` - Special announcement-only channels

**File Storage:**
- Provider: Supabase Storage (S3-compatible)
- Bucket: `chat-files` - User-uploaded attachments (images, documents, etc.)
- Upload: `src/lib/uploadChatFile.ts` - XMLHttpRequest with progress tracking or standard SDK upload
- Access: Public URLs generated for uploaded files
- Path structure: `${userId}/${timestamp}_${filename}` to organize and avoid collisions

**Real-time subscriptions:**
- Provider: Supabase Realtime (WebSocket-based)
- Pattern: `supabase.channel(id).on("postgres_changes", {...}).subscribe()`
- Tables with realtime enabled: `messages`, `message_reactions`, `thread_read_status`, `server_members`, `dm_threads`, `group_chats`, `channels`, `voice_sessions`, `announcement_channels`
- Cleanup: All subscriptions must call `.unsubscribe()` in `useEffect` cleanup

**Presence Tracking:**
- Provider: Supabase Presence API (built-in, WebSocket)
- Implementation: `src/hooks/usePresence.ts` - Tracks online users per channel
- Updates: Real-time user status changes emitted as presence events

## Authentication & Identity

**Auth Provider:**
- Service: Supabase Auth (built-in)
- Implementation: `src/contexts/AuthContext.tsx` - Provides `useAuth()` hook
- Auth methods:
  - Email/password sign up with optional redirect to `https://mshb.vercel.app/auth-callback`
  - Email/password sign in (resolves username to email via RPC call `get_email_by_username`)
  - Password reset via email link
  - Sign out clears session
- Session persistence: localStorage with auto-refresh of expired tokens
- User metadata: Display name, username, date of birth, gender stored in `auth.users` raw_user_meta_data

**Post-Auth:**
- Profile creation: Automatic via `handle_new_user()` trigger on auth.users insert
- Profile fields: user_id, username, display_name, avatar_url, status, status_until, language, theme, created_at, updated_at
- Status management: Custom status text with expiration (`status_until` timestamp)

## Monitoring & Observability

**Error Tracking:**
- Currently: None detected (no Sentry, LogRocket, etc.)
- Client errors: Caught in `src/components/ErrorBoundary.tsx`
- Console logging: DEBUG logs in WebRTC, Supabase, and real-time handlers

**Logs:**
- Approach: Browser console only
- Levels: info, error, debug (prefixed with component name, e.g., `[WebRTC]`, `[VoiceChannel]`)
- Server: Supabase function logs available in Supabase dashboard

**Client-side Analytics:**
- Not detected (no Google Analytics, Mixpanel, etc.)

## CI/CD & Deployment

**Hosting:**
- Platform: Vercel
- Type: Static SPA hosted on global CDN
- Config: `vercel.json` rewrites all routes to `/index.html` for client-side routing
- Domain: `https://mshb.vercel.app` (from code)
- Build: `vite build --base=./` outputs to `dist/`

**Desktop Distribution:**
- Platform: electron-forge
- Makers: Windows (NSIS), macOS (DMG), Linux (deb/rpm)
- Publisher: GitHub releases (via `@electron-forge/publisher-github`)

**CI Pipeline:**
- Not detected in codebase (assume GitHub Actions or Vercel auto-deploy on push)

## Webhooks & Callbacks

**Incoming:**
- Auth callback: `https://mshb.vercel.app/auth-callback` - Supabase redirects email confirmation links here
- Giphy proxy: No incoming webhooks, API calls are request/response only

**Outgoing:**
- None detected (no outbound webhooks to third-party services)

## Browser APIs & Hardware

**WebRTC:**
- Implementation: `src/hooks/useWebRTC.ts` - Custom hook for voice/video peer-to-peer calls
- Features:
  - Audio/video capture via `navigator.mediaDevices.getUserMedia()`
  - Screen sharing via `navigator.mediaDevices.getDisplayMedia()`
  - ICE candidates and SDP negotiation over Supabase Realtime
- Constraints: Audio-only or audio+video configurable per call
- Mute/deafen: Client-side track enable/disable

**Notifications & Sounds:**
- Web Audio API: `src/lib/soundManager.ts` - Synthesized ringtones and tone alerts
- Audio context pre-warming on user gesture (click/keydown)
- Ring frequencies: Outgoing (523/659Hz), Incoming (587/784Hz)
- Tones: Mute, unmute, deafen, undeafen as sine waves
- No external audio assets (synthesized only)

**Media Access:**
- Microphone: `getUserMedia({ audio: true })`
- Camera: `getUserMedia({ video: true })`
- Screen: `getDisplayMedia({ video: true })`
- Permissions: Requested per call, user grants via browser dialog

**Storage:**
- Type: Browser localStorage
- Keys (prefixed `mshb_`):
  - `mshb_appearance_prefs` - Theme/appearance settings (JSON)
  - `mshb_time_format` - Time display format (12h/24h)
  - `mshb_notification_prefs` - Notification settings (JSON)
  - `mshb_social_prefs` - Social visibility settings (JSON)
  - `mshb_device_prefs` - Audio/video device selections (JSON)
- Supabase Session: Auto-managed by Supabase client in localStorage

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Supabase project URL (e.g., `https://wqgotyhepamnwsjcydpy.supabase.co`)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Anon key for client-side access

**Optional env vars:**
- `VITE_URL_REGEX` - Regex pattern for URL detection in messages
- `VITE_SUPABASE_PROJECT_ID` - Project ID (derived from URL if not set)

**Server-side (Supabase/Edge Functions):**
- `GIPHY_API_KEY` - API key for GIPHY service (stored in Supabase secrets, not exposed to client)

**Secrets location:**
- Local: `.env` file (not committed; create from `.env.example`)
- Production: Vercel environment variables (set in Vercel dashboard)
- Supabase: Function secrets via Supabase dashboard Settings

## Rate Limiting & Quotas

**GIPHY:**
- Free tier: 43,200 requests/day (500 requests/10 seconds)
- Proxy function rate limiting: Recommended to implement per-IP throttling in edge function

**Supabase:**
- Database: Depends on pricing tier (free = 0.5M row reads/month)
- Realtime: WebSocket connections limited by tier
- Storage: File size limits per tier

**Vercel:**
- Deployments: Unlimited on Pro plan
- Serverless functions: 100GB-hours/month included

---

*Integration audit: 2026-02-26*
