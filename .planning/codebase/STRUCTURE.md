# Codebase Structure

**Analysis Date:** 2026-02-26

## Directory Layout

```
mshb-main/
├── src/
│   ├── App.tsx                    # Root component: routing tree, provider stack, error boundary
│   ├── main.tsx                   # Entry point: mount React app, set i18n direction
│   ├── index.css                  # Global Tailwind + custom CSS
│   ├── vite-env.d.ts             # Vite type definitions
│   │
│   ├── pages/                     # Route-level components (one per major feature)
│   │   ├── Auth.tsx               # Sign up, sign in, password reset (unprotected)
│   │   ├── AuthCallback.tsx       # OAuth callback handler (unprotected)
│   │   ├── HomeView.tsx           # Home layout wrapper (nested routes: friends, DM, groups)
│   │   ├── FriendsDashboard.tsx   # Friends list, pending requests, user search
│   │   ├── Chat.tsx               # 1-on-1 DM thread view (34KB, heavy feature)
│   │   ├── GroupChat.tsx          # Group chat thread view (30KB, heavy feature)
│   │   ├── ServerView.tsx         # Server hub (channels, voice, members)
│   │   ├── InviteJoin.tsx         # Accept server invite via code
│   │   ├── Settings.tsx           # User profile, preferences, theme
│   │   ├── NotFound.tsx           # 404 fallback
│   │   └── Index.tsx              # Unused redirect
│   │
│   ├── components/                # Presentational components grouped by domain
│   │   ├── ui/                    # shadcn-ui primitives (auto-generated, never edit)
│   │   │   └── [50+ files]        # Button, Input, Dialog, Sheet, etc.
│   │   │
│   │   ├── chat/                  # DM & group chat features
│   │   │   ├── VoiceCallUI.tsx    # Call interface (mute, deafen, end call buttons)
│   │   │   ├── CallListener.tsx   # Global subscription to incoming calls
│   │   │   ├── ChatSidebar.tsx    # DM/group thread list sidebar (inbox view)
│   │   │   ├── ActiveNowPanel.tsx # Show friends in voice channels
│   │   │   ├── EmojiPicker.tsx    # Emoji selection UI
│   │   │   ├── GifPicker.tsx      # GIF search & selection
│   │   │   ├── StickerPicker.tsx  # Sticker selection
│   │   │   ├── FileAttachmentButton.tsx  # File picker trigger
│   │   │   ├── MessageFilePreview.tsx    # Render file attachments in message
│   │   │   ├── MessageReactions.tsx      # Show emoji reactions on messages
│   │   │   ├── MessageContextMenu.tsx    # Edit, delete, pin message options
│   │   │   ├── UserContextMenu.tsx       # Add friend, block user, etc.
│   │   │   ├── UserProfilePanel.tsx      # Display user info in sidebar
│   │   │   ├── GroupMembersPanel.tsx     # List group members
│   │   │   ├── ReplyPreview.tsx          # Show message being replied to
│   │   │   ├── ReplyInputBar.tsx         # Input for message replies
│   │   │   ├── IncomingCallDialog.tsx    # Accept/decline incoming call modal
│   │   │   ├── ImageViewer.tsx           # Full-screen image preview
│   │   │   ├── ForwardImageDialog.tsx    # Share image to another thread
│   │   │   ├── ServerInviteCard.tsx      # Render server invite cards in messages
│   │   │   ├── MarkdownToolbar.tsx       # Markdown formatting buttons (bold, italic, code)
│   │   │   ├── AutoResizeTextarea.tsx    # Self-expanding textarea for input
│   │   │   ├── ChatInputActions.tsx      # Action buttons above input (emoji, gif, etc.)
│   │   │   └── ThreadContextMenu.tsx     # Thread-level options (leave, etc.)
│   │   │
│   │   ├── server/                # Server & channel features
│   │   │   ├── ChannelSidebar.tsx    # Channel tree (text + voice, nested folders) (53KB, complex)
│   │   │   ├── ServerChannelChat.tsx # Server channel message view (26KB)
│   │   │   ├── ServerRail.tsx        # Server list sidebar (21KB, navigation)
│   │   │   ├── VoiceConnectionBar.tsx # Voice connection status & participant list (25KB)
│   │   │   ├── ServerMemberList.tsx  # List server members with roles (14KB)
│   │   │   ├── CreateServerDialog.tsx    # New server creation form
│   │   │   ├── JoinServerDialog.tsx      # Join server by code dialog
│   │   │   ├── InviteModal.tsx           # Generate/manage server invites (13KB)
│   │   │   ├── ServerSettingsDialog.tsx  # Configure server name, icon, roles
│   │   │   ├── ServerFolder.tsx          # Collapsible folder in channel tree
│   │   │   ├── ServerFolderDialog.tsx    # Create/edit channel folder
│   │   │   ├── ServerMemberContextMenu.tsx  # Member options (kick, role change)
│   │   │   ├── VoiceUserContextMenu.tsx     # Options for voice participants
│   │   │   ├── MentionPopup.tsx         # @ mention autocomplete
│   │   │   ├── ScreenShareViewer.tsx    # Display remote screen share (15KB)
│   │   │   └── CameraViewer.tsx         # Display remote camera feed
│   │   │
│   │   ├── layout/                # App-level layout shells
│   │   │   ├── AppLayout.tsx          # Main layout: sidebar + outlet + voice bar + mobile nav
│   │   │   └── HomeSidebar.tsx        # Home/DM sidebar with thread list
│   │   │
│   │   ├── settings/              # Settings UI & tabs
│   │   │   ├── SettingsModal.tsx      # Settings container (modal/full-page)
│   │   │   └── tabs/                 # Settings tab components
│   │   │       ├── ProfileTab.tsx
│   │   │       ├── PreferencesTab.tsx
│   │   │       ├── ThemeTab.tsx
│   │   │       ├── VoiceTab.tsx
│   │   │       └── [others]
│   │   │
│   │   ├── skeletons/             # Loading placeholder components
│   │   │   └── SkeletonLoaders.tsx   # MessageSkeleton, FriendListSkeleton, etc.
│   │   │
│   │   ├── ErrorBoundary.tsx      # React error boundary (class component)
│   │   ├── CreateGroupDialog.tsx  # Create new group chat dialog
│   │   ├── GroupSettingsDialog.tsx # Edit group name, icon, members
│   │   ├── GoLiveModal.tsx         # Start streaming/go live interface
│   │   ├── NavLink.tsx             # Custom nav link wrapper
│   │   ├── PasswordStrengthBar.tsx # Password strength indicator
│   │   ├── StatusBadge.tsx         # User status indicator (online, away, etc.)
│   │   └── StyledDisplayName.tsx   # Display name with custom fonts
│   │
│   ├── contexts/                  # Global state providers
│   │   ├── AuthContext.tsx         # User session, profile, auth methods — useAuth()
│   │   ├── ThemeContext.tsx        # Dark/light mode, accent color, gradients — useTheme()
│   │   ├── AudioSettingsContext.tsx # Global mute/deafen state — useAudioSettings()
│   │   └── VoiceChannelContext.tsx  # Active voice channel, streams — useVoiceChannel()
│   │
│   ├── hooks/                     # Custom React hooks for reusable logic
│   │   ├── useWebRTC.ts           # Voice/video call management with peer connection (23KB)
│   │   ├── usePresence.ts         # User online status tracking
│   │   ├── useMessageReactions.ts # Message reaction subscriptions
│   │   ├── useUnreadCount.ts      # Total unread message count
│   │   ├── useUnreadDMs.ts        # Unread DM thread tracking
│   │   ├── useChannelUnread.ts    # Per-server-channel unread tracking
│   │   ├── useServerVoiceActivity.ts # Track voice channel participants
│   │   ├── usePendingFriendRequests.ts # Pending friend request count
│   │   ├── use-mobile.tsx         # Responsive breakpoint detection (768px)
│   │   └── use-toast.ts           # Toast notification hook interface
│   │
│   ├── integrations/              # External service integrations
│   │   └── supabase/
│   │       ├── client.ts          # Supabase client singleton (auth + realtime config)
│   │       └── types.ts           # Auto-generated TypeScript types (generated via CLI, never edit)
│   │
│   ├── lib/                       # Utility functions
│   │   ├── uploadChatFile.ts      # File upload to Supabase Storage with progress tracking
│   │   ├── soundManager.ts        # Audio notification playback (notifSound.mp3, ringtone.mp3)
│   │   ├── emojiUtils.ts          # Emoji detection & sizing utilities
│   │   ├── renderLinkedText.tsx   # URL linkification utility
│   │   ├── inviteUtils.ts         # Server invite code detection in text
│   │   ├── unicodeFonts.ts        # Unicode font decoration conversion
│   │   └── utils.ts               # cn() Tailwind class merging (from clsx)
│   │
│   ├── i18n/                      # Internationalization
│   │   ├── en.ts                  # English translation strings (dot-notation keys)
│   │   ├── ar.ts                  # Arabic translation strings (dot-notation keys)
│   │   └── index.ts               # i18next initialization & language detection
│   │
│   └── test/                      # Test files (if any)
│
├── supabase/                      # Database migrations & schema
│   ├── migrations/                # SQL migration files (timestamp_description.sql)
│   │   ├── 20250101000000_initial_schema.sql
│   │   ├── [other migrations...]
│   │   └── 20260226000001_announcement_channels.sql
│   └── config.toml               # Supabase local config
│
├── .env                          # Environment variables (git-ignored, contains secrets)
├── .env.example                  # Template for required env vars
├── .gitignore                    # Git ignore rules
├── package.json                  # Dependencies, build scripts
├── package-lock.json             # Locked dependency versions
├── tsconfig.json                 # TypeScript config (lenient: strict: false)
├── vite.config.ts                # Vite build config with @ alias
├── tailwind.config.ts            # Tailwind CSS config
├── index.html                    # HTML entry point
├── CLAUDE.md                     # Project instructions (this document)
└── README.md                     # Project overview
```

## Directory Purposes

**src/**
- Purpose: All application source code
- Contains: React components, hooks, pages, styles, utilities, contexts
- Key files: `App.tsx` (root), `main.tsx` (entry), `index.css` (global styles)

**src/pages/**
- Purpose: Route-level components (one component per major route)
- Contains: Components that coordinate page-specific data, subscriptions, and child components
- Key files: `Chat.tsx`, `GroupChat.tsx`, `ServerView.tsx` (the three main conversation views)

**src/components/**
- Purpose: Reusable presentation components grouped by feature domain
- Contains: UI components that receive props and render (minimal logic)
- Subdirectories:
  - `chat/` — DM & group chat specific UI (message input, reactions, etc.)
  - `server/` — Server & channel specific UI (channel tree, member list, etc.)
  - `layout/` — Shell components (AppLayout, sidebars)
  - `settings/` — Settings UI
  - `ui/` — shadcn-ui primitives (auto-generated, don't edit)
  - `skeletons/` — Loading placeholders

**src/contexts/**
- Purpose: Global state providers using React Context API
- Contains: Context definitions, provider components, custom hooks for consumption
- Pattern: Each file exports both `FooContext` and `useFoo()` hook
- Mounted in order: `App.tsx` provider stack determines dependency order

**src/hooks/**
- Purpose: Reusable business logic encapsulated as React hooks
- Contains: Data fetching, subscriptions, event handling, media management
- Key files: `useWebRTC.ts` (1000+ LOC), `usePresence.ts` (realtime presence)

**src/integrations/supabase/**
- Purpose: Supabase client configuration and generated types
- Files:
  - `client.ts` — Singleton Supabase client (23KB of config in CLAUDE.md)
  - `types.ts` — Auto-generated from remote schema via `supabase gen types typescript` (never edit)

**src/lib/**
- Purpose: Utility functions and helpers (no state, no subscriptions)
- Files:
  - `uploadChatFile.ts` — File upload abstraction
  - `soundManager.ts` — Audio playback manager
  - `emojiUtils.ts` — Emoji detection
  - Others: text rendering, formatting, font conversion

**src/i18n/**
- Purpose: Translations and i18next configuration
- Pattern: `en.ts` and `ar.ts` contain matching keys for English and Arabic
- Loaded at startup in `main.tsx`, direction set based on language preference

**supabase/migrations/**
- Purpose: Database schema changes tracked as versioned SQL files
- Pattern: Filename = `timestamp_description.sql` (e.g., `20250101000000_add_messages_table.sql`)
- Key files:
  - Initial schema (messages, profiles, channels, etc.)
  - RLS policies for all tables
  - `ALTER PUBLICATION supabase_realtime ADD TABLE` statements for realtime-enabled tables

## Key File Locations

**Entry Points:**
- `src/main.tsx` — React app mount point, global error traps
- `src/App.tsx` — Provider stack, routing tree, error boundary
- `src/pages/Auth.tsx` — Unauthenticated entry (sign in/up)

**Configuration:**
- `.env` — Supabase credentials, Vite base URL (git-ignored)
- `tsconfig.json` — TypeScript config with `@/` alias for src
- `vite.config.ts` — Build config with `@` path alias
- `tailwind.config.ts` — Tailwind CSS customization
- `src/i18n/index.ts` — i18next initialization

**Core Logic:**
- `src/contexts/AuthContext.tsx` — Session state, user profile, auth methods
- `src/hooks/useWebRTC.ts` — Voice/video call implementation (WebRTC, SDP optimization)
- `src/lib/uploadChatFile.ts` — File upload with progress
- `src/components/chat/ChatSidebar.tsx` — DM/group thread list
- `src/components/server/ChannelSidebar.tsx` — Server channel tree

**Testing:**
- `src/test/` — Test files (if any; no comprehensive test suite currently)

**Styling:**
- `src/index.css` — Global Tailwind + custom CSS variables
- Component styles: Inline Tailwind classes via `className` prop

## Naming Conventions

**Files:**
- Components: `PascalCase.tsx` (e.g., `VoiceCallUI.tsx`, `ChatSidebar.tsx`)
- Hooks: `camelCase.ts` with `use` prefix (e.g., `useWebRTC.ts`, `usePresence.ts`)
- Utilities: `camelCase.ts` (e.g., `uploadChatFile.ts`, `emojiUtils.ts`)
- Context: `PascalCase.tsx` (e.g., `AuthContext.tsx`, `VoiceChannelContext.tsx`)
- Pages: `PascalCase.tsx` (e.g., `Chat.tsx`, `ServerView.tsx`)

**Directories:**
- Feature domains: `lowercase` plural (e.g., `components/chat`, `components/server`)
- Group by layer: `contexts/`, `hooks/`, `lib/`, `pages/`, `components/`

**Functions & Variables:**
- camelCase (e.g., `handleMessageSend()`, `loadMessages()`, `activeChannel`)
- Constants: UPPER_SNAKE_CASE (e.g., `PAGE_SIZE = 30`, `MAX_FILE_SIZE`)
- Booleans: `is` or `has` prefix (e.g., `isMobile`, `hasMore`, `isEditing`)
- State setters: `set` prefix (e.g., `setMessages()`, `setEditingId()`)

**React Component Props:**
```typescript
interface Props {
  threadId: string;
  onClose?: () => void;
  messages: Message[];
  isLoading?: boolean;
}
```

**Types & Interfaces:**
- Types from Supabase: Use `Tables<"table_name">` (auto-generated)
- Custom types: PascalCase (e.g., `interface Message`, `type CallState`)
- Avoid `any` except for Supabase query mismatches (use `as any` to bypass type checks)

## Where to Add New Code

**New Feature (e.g., pinned messages, threads):**
1. **Database schema:** Add migration in `supabase/migrations/` with RLS policies
2. **TypeScript types:** Run `supabase gen types typescript` to update `src/integrations/supabase/types.ts`
3. **Data fetching:** Write hook in `src/hooks/` if complex (or inline in component)
4. **Realtime subscription:** Add to migration: `ALTER PUBLICATION supabase_realtime ADD TABLE public.new_table`
5. **Components:** Create in `src/components/chat/` or `src/components/server/` depending on scope
6. **Page integration:** Modify relevant page file (`Chat.tsx`, `ServerView.tsx`) to use new hook/component
7. **Translations:** Add keys to both `src/i18n/en.ts` and `src/i18n/ar.ts`
8. **Tests:** Add to `src/test/` if critical

**New Component/Module:**
- Implementation: Create `.tsx` file in `src/components/[domain]/`
- Pattern:
  ```typescript
  interface Props { /* prop types */ }
  const MyComponent = ({ prop1, prop2 }: Props) => { /* JSX */ };
  export default MyComponent;
  ```
- Import in parent: `import MyComponent from "@/components/[domain]/MyComponent";`

**New Utility Function:**
- Shared helpers: Create in `src/lib/` (e.g., `src/lib/myUtil.ts`)
- Export as named export: `export const myUtil = () => { };`
- Use `@/lib/myUtil` path alias in imports

**New Hook:**
- Create in `src/hooks/` with `use` prefix
- Pattern: Return object with state + methods
- Example:
  ```typescript
  export const useMyHook = (id: string) => {
    const [data, setData] = useState([]);
    useEffect(() => { /* subscribe */ }, [id]);
    return { data };
  };
  ```

**New Page/Route:**
- Create in `src/pages/` with PascalCase filename
- Add route to `src/App.tsx` routing tree
- Wrap with `<ProtectedRoute>` if authenticated
- Import page: `import MyPage from "@/pages/MyPage";`

## Special Directories

**src/components/ui/**
- Purpose: shadcn-ui primitives (Radix UI + Tailwind)
- Generated: Yes (via `npx shadcn-ui add [component]`)
- Committed: Yes (components are copied, not linked)
- Important: Never edit these files; run `shadcn-ui add` to update

**supabase/migrations/**
- Purpose: Database schema versioning
- Generated: No (manually written SQL)
- Committed: Yes (all migrations tracked)
- Run locally: `supabase migration up` to apply migrations to local Supabase instance

**.env**
- Purpose: Environment variables with secrets
- Generated: No (created by developer)
- Committed: No (git-ignored; only `.env.example` is committed)
- Required vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

**src/i18n/ar.ts & src/i18n/en.ts**
- Purpose: Language-specific translation strings
- Generated: No (manually maintained)
- Committed: Yes (source translations)
- Pattern: Mirror keys between files; Arabic is RTL, applied via `document.documentElement.dir = "rtl"`

---

*Structure analysis: 2026-02-26*
