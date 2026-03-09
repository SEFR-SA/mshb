# CLAUDE.md — MSHB Project Guide

## Project Purpose
MSHB is a real-time communication platform (Discord/Telegram-style) built as an Electron desktop app and PWA. It supports DMs, group chats, servers & channels, voice/video calling (WebRTC), rich messaging, a social graph, and full internationalization (English + Arabic RTL).

## Tech Stack
- **UI:** React 18 + TypeScript (Vite) — path alias `@/` → `src/`
- **Styling:** Tailwind CSS + shadcn-ui (Radix UI primitives)
- **Backend:** Supabase (PostgreSQL + Realtime + Auth + Storage)
- **Real-time:** Supabase Realtime (`postgres_changes` subscriptions)
- **Calling:** WebRTC (custom `useWebRTC` hook)
- **i18n:** i18next + react-i18next (English + Arabic)
- **State:** React Context API + direct Supabase calls (React Query installed but unused)
- **Routing:** React Router v6 (hash-based in Electron)

## Core Directives (CRITICAL — Always Enforce)

### 1. Plan First
Before writing code for any non-trivial task, propose a step-by-step plan and wait for approval.

### 2. Single Source of Truth (SSOT)
Never duplicate display logic. Always use the canonical shared components:

| Feature | Component | Location |
|---------|-----------|----------|
| Styled display name | `StyledDisplayName` | `@/components/StyledDisplayName` |
| Avatar decoration frame | `AvatarDecorationWrapper` | `@/components/shared/AvatarDecorationWrapper` |
| Nameplate background | `NameplateWrapper` | `@/components/shared/NameplateWrapper` |
| Profile effect overlay | `ProfileEffectWrapper` | `@/components/shared/ProfileEffectWrapper` |

Any profile query that renders a styled name MUST select: `name_font, name_effect, name_gradient_start, name_gradient_end`

### 3. Pro Gating
All new cosmetic/premium features default to Pro-only. Check `profile?.is_pro` via `useAuth()`. Show lock icons and upgrade toasts to free users — never silently hide features.

### 4. No Hallucinations
If you do not know exact asset dimensions, wrapper props, or DB column names — stop and ask. Never guess. All canonical specs are in the documentation files below.

### 5. No Over-Engineering
Use the shortest correct solution. Native array methods over loops. No unnecessary abstractions. If your diff is 80+ lines for a simple feature, rewrite it.

## Documentation Directory
Read these files for specific details — do NOT rely on memory alone:

| Topic | File |
|-------|------|
| DB schema, Supabase patterns, real-time, RLS, auth, context stack | `.planning/codebase/INTEGRATIONS.md` |
| Coding conventions, component patterns, CSS, translations, mobile rules | `.planning/codebase/CONVENTIONS.md` |
| Cosmetics: wrapper components, Pro logic, asset dimensions, themes, badges | `.planning/codebase/CUSTOMIZATION_ENGINE.md` |
| Directory structure, feature-add checklist, key files reference | `.planning/codebase/ARCHITECTURE.md` |
| Full tech stack versions and config | `.planning/codebase/STACK.md` |
| Known bugs, tech debt, performance concerns | `.planning/codebase/CONCERNS.md` |
| Testing patterns and Vitest config | `.planning/codebase/TESTING.md` |
| Standard operating procedures for components, migrations, cosmetics | `.planning/skills/` |

## Cosmetic Asset Specs
Per-asset guides with exact dimensions, config files, and wrapper usage:

| Asset | Canonical Size | Guide |
|-------|---------------|-------|
| Avatar Decorations | 144 × 144 px | `docs/cosmetic-assets/avatar-decorations.md` |
| Nameplates | 224 × 42 px | `docs/cosmetic-assets/nameplates.md` |
| Profile Effects | 480 × 880 px | `docs/cosmetic-assets/profile-effects.md` |
| Server Tag Badges | 16 × 16 px (SVG) | `docs/cosmetic-assets/server-tags.md` |
| Display Name Fonts & Effects | — | `docs/cosmetic-assets/display-name-fonts.md` |
| Soundboard Clips | — | `docs/cosmetic-assets/soundboard.md` |
| Marketplace / Item Shop | — | `docs/cosmetic-assets/marketplace.md` |
