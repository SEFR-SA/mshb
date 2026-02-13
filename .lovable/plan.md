

# 🌌 Purple Galaxy Chat — MVP Plan

## Overview
A Discord-inspired real-time 1:1 messaging web app with a stunning "Purple Galaxy" theme, bilingual support (EN/AR with RTL), dark/light mode, and PWA installability. Built on Lovable Cloud (Supabase) for auth, database, real-time, and storage.

---

## Phase 1: Foundation & Theming

### Purple Galaxy Design System
- Deep purple gradient backgrounds with subtle galaxy noise/particle textures and soft glow effects
- Modern rounded UI components, glass-morphism cards
- Custom color palette: deep purples, soft violets, accent glows
- Google Fonts: Inter for English, **Noto Naskh Arabic** for Arabic text

### Dark/Light Mode
- Dark mode as default; toggle switch in settings and header
- Preference persisted to localStorage (and later to user profile)

### Internationalization (i18n)
- Language toggle (EN/AR) accessible from header and settings
- When Arabic is selected, entire UI switches to RTL layout (mirrored navigation, right-aligned text)
- All UI strings stored in translation files for both languages

### PWA Setup
- App manifest with Purple Galaxy branding and icons
- Basic service worker for installability ("Add to Desktop / Home Screen")
- Offline shell support

### Responsive Layout
- Mobile-first design with bottom navigation on mobile, sidebar on desktop
- Smooth transitions between breakpoints

---

## Phase 2: Authentication & User Profiles

### Auth Flows (Supabase Auth)
- Email/password signup with validation (email format, password min 8 chars)
- Login & logout
- Password reset flow (email-based via Supabase)

### User Profiles
- **Database**: `profiles` table linked to `auth.users` with auto-creation trigger
- **Fields**: avatar (uploaded via Supabase Storage), username (unique), display name, status text, language preference, theme preference
- **Profile Settings Page**: Edit all profile fields, upload avatar, set language & theme
- **Security**: RLS policies so users can only read/update their own profile; usernames queryable for DM search

---

## Phase 3: Presence System

### Real-Time Presence
- Track online/offline status using Supabase Realtime Presence
- Show online indicator (green dot) on user avatars in DM inbox and chat header
- Optional "last seen" timestamp for offline users
- Presence updates broadcast in real time on connect/disconnect

---

## Phase 4: Direct Messages — Core

### Data Model
- **`dm_threads`**: stores participant pairs, `last_message_at` for sorting
- **`messages`**: `thread_id`, `author_id`, `content`, `created_at`, `edited_at`, `deleted_for_everyone` (boolean)
- **`message_hidden`**: `user_id`, `message_id` — for "delete for me" (per-user hide)
- **RLS**: Only thread participants can read/write messages in their threads

### DM Inbox Screen
- List of DM threads sorted by most recent activity
- Each item: avatar, display name, online indicator, last message snippet, unread count badge
- Search bar to find users by username/display name and start new DMs
- Unread count updates in real time

### DM Chat Screen
- **Header**: Other user's avatar, name, online status
- **Message List**: Lazy-loaded (newest first, scroll up to load older)
- **Timestamps** on each message (smart formatting: "just now", "2m ago", full date)
- **Composer**: Text input with send button, supports Enter to send
- **Typing Indicator**: Real-time "User is typing…" shown in chat

### Real-Time Events (Supabase Realtime)
- `message_created` → new message appears instantly for both participants
- `message_edited` → content updates live with "Edited" badge
- `message_deleted_for_everyone` → placeholder "This message was deleted" appears for both
- `typing_started` / `typing_stopped` → via Realtime broadcast
- `presence_updated` → online/offline status changes

---

## Phase 5: Message Actions

### Context Menu (long-press on mobile, right-click on desktop)

**If I'm the author:**
- ✏️ Edit — opens inline editor, saves via API, broadcasts update
- 🗑️ Delete for me — hides message locally (insert into `message_hidden`)
- 🗑️ Delete for everyone — sets `deleted_for_everyone = true`, replaces with placeholder for both users

**If I'm NOT the author:**
- 🗑️ Delete for me only

**If message is already deleted-for-everyone (placeholder):**
- 🗑️ Delete for me only (to hide the placeholder)

### Edit Rules
- Only author can edit; "Edited" indicator shown on edited messages
- Edit updates both sides instantly via real-time

### Delete for Everyone
- No time limit; available always for author
- Message content replaced with "This message was deleted" placeholder
- Placeholder visible to both participants in real time

### Delete for Me
- Either participant can hide any message (including other person's messages, including placeholders)
- Implemented via `message_hidden` join table — message only hidden for the requesting user

---

## Phase 6: Backend Security & Enforcement

- **RLS Policies**: Thread access restricted to participants; message CRUD restricted appropriately
- **Edge Functions** (if needed): For rate limiting message sends, input sanitization
- **Validation**: Message content length limits, sanitized input
- **Rate Limiting**: Prevent spam on message creation
- Only author can edit or delete-for-everyone (enforced at DB level via RLS)
- Delete-for-me only affects the requesting user's `message_hidden` records

---

## Architecture Notes (for future extensibility)
- Code structured with clear separation: auth, messaging, presence, i18n, theme modules
- Database schema designed to later support servers, channels, and group chats without major rewrites
- Real-time subscription patterns reusable for future channel messaging

