# MSHB — Improvement & Feature Recommendations

## Table of Contents
1. [Critical Fixes](#1-critical-fixes)
2. [Code Quality](#2-code-quality)
3. [Performance](#3-performance)
4. [Security](#4-security)
5. [Testing](#5-testing)
6. [Accessibility](#6-accessibility)
7. [Feature Suggestions](#7-feature-suggestions)

---

## 1. Critical Fixes

### 1.1 Add a Global React Error Boundary
The app has no error boundary. A single uncaught component error will white-screen the entire application.

**File to create:** `src/components/ErrorBoundary.tsx`

```tsx
import { Component, ReactNode } from "react";

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError)
      return (
        <div className="flex h-screen items-center justify-center flex-col gap-4">
          <p className="text-destructive">Something went wrong.</p>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    return this.props.children;
  }
}
```

Wrap `<App />` in `src/main.tsx` with `<ErrorBoundary>`.

---

### 1.2 Fix Unhandled Promise Rejections
There are 10+ `.then()` calls with no `.catch()` across `usePresence.ts`, `Chat.tsx`, and `VoiceConnectionBar.tsx`. Silent failures are impossible to debug in production.

**Pattern to fix:**
```ts
// Before (silent failure)
supabase.from("profiles").update({...}).eq("user_id", userId).then();

// After
supabase.from("profiles").update({...}).eq("user_id", userId)
  .then(({ error }) => { if (error) console.error("[presence]", error); });
```

---

### 1.3 Remove Empty `catch` Blocks in WebRTC
`src/hooks/useWebRTC.ts` has several empty `catch {}` blocks that swallow ICE candidate errors and SDP negotiation failures. These should at minimum log the error so developers can diagnose connection problems.

---

## 2. Code Quality

### 2.1 Eliminate `any` Type Casts
The following files use `as any` extensively — reducing the value of TypeScript:

| File | Issue |
|------|-------|
| `contexts/AuthContext.tsx` | `data: any` return types |
| `hooks/useServerUnread.ts` | Supabase query results cast to `any` |
| `hooks/useWebRTC.ts` | RTCPeerConnection options cast to `any` |
| `components/server/VoiceConnectionBar.tsx` | `"voice_channel_participants" as any` |

**Fix:** Extend the Supabase generated types (`src/integrations/supabase/types.ts`) to include the missing tables (e.g., `voice_channel_participants`) and use proper generics.

---

### 2.2 Replace Magic Numbers with Named Constants
Scattered literal values make the code hard to tune and reason about.

```ts
// src/lib/constants.ts  (new file)
export const WEBRTC = {
  VIDEO_HIGH_BITRATE: 8_000_000,
  VIDEO_LOW_BITRATE: 4_000_000,
  SPEAKING_THRESHOLD: 15,          // volume level 0-100
} as const;

export const MESSAGES = {
  PAGE_SIZE: 30,
  MAX_FILE_SIZE_MB: 200,
} as const;
```

---

### 2.3 Re-enable `no-unused-vars` ESLint Rule
`eslint.config.js` disables this rule, allowing dead code to accumulate. Re-enable it, fix (or prefix with `_`) the variables that trigger it, then keep the rule on.

---

### 2.4 Standardise Async Patterns
The codebase mixes `async/await` with `.then()` chains — sometimes in the same function. Pick one style (prefer `async/await`) and apply it consistently.

---

### 2.5 Extract Audio Context into a Singleton
`src/hooks/useWebRTC.ts` creates a new `AudioContext` for every peer connection's volume monitor. Browsers cap the number of simultaneous audio contexts.

```ts
// src/lib/audioContext.ts
let _ctx: AudioContext | null = null;
export const getAudioContext = () => {
  if (!_ctx || _ctx.state === "closed") _ctx = new AudioContext();
  return _ctx;
};
```

---

### 2.6 Split `VoiceChannelContext`
The context exposes 10+ values and setters. Consider splitting into:
- `VoiceConnectionContext` — connection state (channel, participants)
- `VoiceMediaContext` — local media state (muted, deafened, camera, screen share)

This limits unnecessary re-renders to only the consumers that care.

---

## 3. Performance

### 3.1 Memoize Derived Lists
Friend search, member filtering, and channel lookups are recalculated on every render. Wrap with `useMemo`:

```ts
const filteredFriends = useMemo(
  () => friends.filter(f => f.username.includes(query)),
  [friends, query]
);
```

---

### 3.2 Virtualise Long Message Lists
For channels with thousands of messages, a DOM with thousands of nodes is slow. Replace the flat scroll container with **TanStack Virtual** (`@tanstack/react-virtual`) — it renders only visible rows.

---

### 3.3 Audit Supabase Realtime Subscriptions
Every page/component creates `supabase.channel(...)` subscriptions. Verify every subscription is unsubscribed on component unmount (the `return () => supabase.removeChannel(channel)` pattern in `useEffect`). Missing cleanups cause memory leaks and duplicate events after navigation.

---

### 3.4 Add React Query Caching for Static Data
Server metadata (name, icon, channel list) rarely changes but is refetched on every view. Set a sensible `staleTime` on these queries:

```ts
useQuery({ queryKey: ["server", id], staleTime: 60_000 })
```

---

## 4. Security

### 4.1 Add Rate Limiting to User Search
The `/friends` discovery search has no debounce on the API call and no server-side rate limit. Add:
- Client-side: 300 ms debounce before firing the Supabase query.
- Server-side: A Supabase Edge Function wrapper with a simple token bucket, or rely on Supabase's built-in request throttling.

---

### 4.2 Validate File MIME Types Server-Side
File uploads (`src/lib/uploadChatFile.ts`) currently check the extension/MIME client-side only. A Supabase Storage policy or Edge Function should verify the actual MIME type of uploaded blobs to prevent disguised executable uploads.

---

### 4.3 Move Sensitive Config out of `.env`
Even though Supabase anon keys are public by design, store them in `.env.local` (gitignored) and document required variables in a `.env.example`. This establishes the secure pattern for any future secrets (e.g., a Giphy API key).

---

## 5. Testing

The project has a single placeholder test file. The following coverage targets are recommended:

| Layer | What to test | Framework |
|-------|-------------|-----------|
| Utilities | `emojiUtils`, `renderLinkedText`, `uploadChatFile` | Vitest |
| Hooks | `useUnreadCount`, `usePendingFriendRequests`, `useMessageReactions` | Vitest + `@testing-library/react` |
| Components | `MessageContextMenu`, `VoiceCallUI`, `EmojiPicker` render/interaction | `@testing-library/react` |
| E2E | Auth flow, send message, voice call initiation | Playwright |

Start with utility functions — they have no UI dependencies and give immediate coverage.

---

## 6. Accessibility

### 6.1 Keyboard Navigation
- The channel sidebar and member list should be keyboard-navigable (arrow keys, Enter to select).
- All icon-only buttons need `aria-label` attributes (e.g., the mute, deafen, camera toggles in voice calls).

### 6.2 Colour Contrast
The gradient theme presets should be checked against WCAG AA (4.5:1 for body text, 3:1 for UI components). Some dark gradient presets may fail.

### 6.3 Screen Reader Support
- Message timestamps need `<time dateTime="...">` tags.
- Unread badges need `aria-label="N unread messages"`.
- `role="log"` and `aria-live="polite"` on message lists so screen readers announce new messages.

### 6.4 Focus Management in Modals
Dialogs should trap focus (`Radix Dialog` does this by default — verify no custom dialogs bypass it) and return focus to the trigger on close.

---

## 7. Feature Suggestions

### 7.1 Message Search
Allow users to search message history within a DM or server channel by keyword, sender, or date range. Supabase full-text search (`to_tsvector`) can power this.

### 7.2 Message Pinning
Moderators and channel owners can pin important messages. A "Pinned Messages" panel in the channel header lists all pinned items.

**Schema addition:**
```sql
ALTER TABLE messages ADD COLUMN pinned_at timestamptz;
ALTER TABLE messages ADD COLUMN pinned_by uuid REFERENCES profiles(user_id);
```

### 7.3 Threads / Reply Threads
Extend the existing reply system into full sub-threads — click a reply count indicator to open a side panel showing only that conversation branch (similar to Slack threads).

### 7.4 Scheduled/Slow-Mode Channels
Let server admins set a per-channel posting cooldown (e.g., one message per 30 seconds) to reduce spam in large servers.

### 7.5 Server Roles & Permissions
Currently server membership is binary (member vs. owner). Add a roles system:
- Admin, Moderator, Member tiers
- Per-channel permission overrides (read-only, post, manage messages)

**Schema addition:**
```sql
CREATE TABLE server_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id uuid REFERENCES servers(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE TABLE server_member_roles (
  server_id uuid, user_id uuid, role_id uuid,
  PRIMARY KEY (server_id, user_id, role_id)
);
```

### 7.6 Read-State Sync Across Devices
Currently the unread count is tracked in browser memory / local state. Persist it to a `read_positions` table so unread state is consistent when the user logs in from another device.

```sql
CREATE TABLE read_positions (
  user_id uuid REFERENCES profiles(user_id),
  channel_id uuid,          -- or dm_conversation_id
  last_read_message_id uuid,
  PRIMARY KEY (user_id, channel_id)
);
```

### 7.7 User Activity / Status Messages
Allow users to set a custom status string (e.g., "In a meeting", "Working on MSHB") in addition to the existing Online/Away/DND indicators — visible in tooltips and the member list.

### 7.8 Notification Preferences per Channel
Let users configure per-channel notification behaviour: All Messages | Only Mentions | Nothing. Store preferences in Supabase so they roam across devices.

### 7.9 Voice Channel Recording (Optional / Consent-gated)
Provide an opt-in recording feature for voice/video channels with explicit per-user consent prompts. Store recordings in Supabase Storage with a configurable retention period.

### 7.10 Progressive Web App (PWA) Support
Add a `manifest.json` and service worker to allow installation on mobile/desktop, offline access to cached conversations, and push notifications via the Web Push API.

### 7.11 Message Formatting / Markdown Support
Extend the existing URL-rendering in `renderLinkedText.tsx` to support a safe subset of Markdown:
- **bold**, _italic_, ~~strikethrough~~
- \`inline code\` and triple-backtick code blocks with syntax highlighting (use **Prism.js** or **highlight.js**)
- Block quotes `> text`

### 7.12 Emoji/Avatar Reactions on Voice Participants
Allow voice call participants to send transient emoji reactions (a floating animation visible to all participants for ~3 seconds) — commonly used in Discord/Teams to express agreement without unmuting.

### 7.13 Server Discovery / Public Servers
Add an optional "public" flag to servers, making them searchable in a discovery page. Include categories (Gaming, Study, Tech, etc.) and a member count.

### 7.14 Audit Log for Servers
Record administrative actions (kick, ban, channel create/delete, role changes) in a server audit log, visible to server admins.

### 7.15 Mobile App (React Native / Expo)
The existing React + Supabase stack maps cleanly to **Expo** (React Native). A shared hooks/utilities layer (`src/hooks`, `src/lib`) could be reused directly, with platform-specific UI components.

---

## Priority Matrix

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Error Boundary | High | Low | **P0** |
| Unhandled promises fix | High | Low | **P0** |
| Rate-limit user search | High | Low | **P0** |
| Message search | High | Medium | **P1** |
| Server roles & permissions | High | High | **P1** |
| Read-state sync across devices | High | Medium | **P1** |
| Re-enable `no-unused-vars` ESLint | Medium | Low | **P1** |
| Virtualise message lists | Medium | Medium | **P2** |
| Testing (utilities + hooks) | Medium | Medium | **P2** |
| Message formatting / Markdown | Medium | Medium | **P2** |
| Accessibility improvements | Medium | Medium | **P2** |
| PWA support | Medium | Medium | **P2** |
| Message pinning | Low | Low | **P3** |
| User status messages | Low | Low | **P3** |
| Server discovery | Low | High | **P3** |
| Voice recording | Low | High | **P3** |
