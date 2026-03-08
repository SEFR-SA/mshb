

## MSHB Landing Page -- Implementation Plan

### Overview
Create a Discord-style landing page at `/` using Sado (light) / Mjlis (dark) brand colors, with Saudi Made badge, feature showcase, "Download Now" and "Sign Up" CTAs. Move the entire app to `/channels/@me` prefix.

### Reference Design
Following the uploaded Discord landing page layout: hero with large heading + CTAs, alternating left/right feature sections with device mockups, scrolling marquee bar, final CTA section, and footer.

---

### 1. Create Landing Page (`src/pages/LandingPage.tsx`)

A self-contained page with scoped Sado/Mjlis CSS variables (respects `prefers-color-scheme` + manual toggle). Sections:

**Navbar** -- MSHB logo, theme toggle (light/dark), "Download Now" button, "Sign Up" button (links to `/auth`)

**Hero Section** -- Large bold heading (e.g., "YOUR PLACE TO TALK, PLAY & CONNECT"), subtitle, two CTA buttons: "Download Now" (links to download/placeholder) and "Sign Up" (links to `/auth`). Saudi Made badge image from the provided URL. Background uses brand primary color with subtle decorative elements.

**Feature Sections (alternating layout, ~5-6 sections):**
1. "Make Your Group Chats More Fun" -- text left, placeholder image right (recommended: 600x400px)
2. "Stream Like You're In The Same Room" -- placeholder image left, text right (recommended: 800x450px)
3. "Hop In When You're Free, No Need To Call" -- text left, placeholder image right (recommended: 500x600px)
4. "See Who's Around To Chill" -- placeholder image left, text right (recommended: 600x500px)
5. "Always Have Something To Do Together" -- text left, placeholder image right (recommended: 700x400px)
6. "Wherever You Are, Hang Out Here" -- placeholder image left, text right (recommended: 600x400px)

**Scrolling Marquee** -- Horizontal scrolling text: "TALK -- PLAY -- CHAT -- HANG OUT" repeating (CSS animation)

**Final CTA Section** -- "YOU CAN'T SCROLL ANYMORE, BETTER GO CHAT" with "Sign Up" button

**Footer** -- MSHB branding, Saudi Made badge, minimal links

All placeholder images will use a gray box with dimensions text overlay so you know what to replace.

---

### 2. Route Migration (`src/App.tsx`)

```
/              → LandingPage (public, no auth)
/auth          → Auth (stays the same)
/channels/@me  → ProtectedRoute > AppLayout
  /channels/@me          → HomeView > FriendsDashboard
  /channels/@me/friends  → FriendsDashboard
  /channels/@me/chat/:threadId → Chat
  /channels/@me/group/:groupId → GroupChat
  /channels/@me/settings → SettingsModal
/channels/server/:serverId → ServerView
/channels/server/:serverId/channel/:channelId → ServerView
/invite/:code  → InviteJoin
```

Auth redirect on login changes from `"/"` to `"/channels/@me"`.

---

### 3. Internal Navigation Updates

All `navigate("/")` and `to="/"` references need updating to `/channels/@me`. Files affected:

| File | What to change |
|------|---------------|
| `src/pages/Auth.tsx` | `Navigate to="/"` → `/channels/@me` |
| `src/pages/Chat.tsx` | `navigate("/")` → `/channels/@me` (2 occurrences) |
| `src/pages/GroupChat.tsx` | `navigate("/")` → `/channels/@me` (3 occurrences) |
| `src/pages/InviteJoin.tsx` | `navigate("/")` → `/channels/@me` |
| `src/pages/HomeView.tsx` | pathname checks: `"/"` → `/channels/@me` |
| `src/components/server/ServerRail.tsx` | `navigate("/")` and pathname checks → `/channels/@me` |
| `src/components/server/ServerSettingsDialog.tsx` | `navigate("/")` → `/channels/@me` |
| `src/components/layout/HomeSidebar.tsx` | `navigate("/friends")` → `/channels/@me/friends`, pathname check |
| `src/components/layout/AppLayout.tsx` | `to="/"` → `/channels/@me` |

---

### 4. Scoped Theme Variables

The landing page wraps content in a div with CSS custom properties set inline (Sado for light, Mjlis for dark), so it uses brand colors independent of the app's theme engine. A `useMediaQuery('(prefers-color-scheme: dark)')` check or a local state toggle determines which palette to apply.

---

### Files Summary

| File | Action |
|------|--------|
| `src/pages/LandingPage.tsx` | **Create** -- full landing page |
| `src/App.tsx` | **Edit** -- add landing route, restructure app routes under `/channels/@me` and `/channels/server` |
| `src/pages/Auth.tsx` | **Edit** -- redirect to `/channels/@me` |
| `src/pages/Chat.tsx` | **Edit** -- update navigate calls |
| `src/pages/GroupChat.tsx` | **Edit** -- update navigate calls |
| `src/pages/HomeView.tsx` | **Edit** -- update pathname checks |
| `src/pages/InviteJoin.tsx` | **Edit** -- update navigate call |
| `src/components/server/ServerRail.tsx` | **Edit** -- update navigate + pathname checks |
| `src/components/server/ServerSettingsDialog.tsx` | **Edit** -- update navigate call |
| `src/components/layout/HomeSidebar.tsx` | **Edit** -- update navigate + pathname checks |
| `src/components/layout/AppLayout.tsx` | **Edit** -- update NavLink `to` |

### Placeholder Image Dimensions Guide

| Section | Recommended Size | Notes |
|---------|-----------------|-------|
| Hero background/decoration | 1200x600px | Abstract brand-colored artwork |
| Feature mockup 1 (Group Chat) | 600x400px | App screenshot showing group chat |
| Feature mockup 2 (Streaming) | 800x450px | Widescreen streaming UI |
| Feature mockup 3 (Voice) | 500x600px | Portrait voice channel UI |
| Feature mockup 4 (Members) | 600x500px | Member list / presence |
| Feature mockup 5 (Activities) | 700x400px | Activities / integrations |
| Feature mockup 6 (Mobile) | 400x600px | Mobile app screenshot |

