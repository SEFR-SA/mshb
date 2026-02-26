# Coding Conventions

**Analysis Date:** 2026-02-26

## Naming Patterns

**Files:**
- Components: PascalCase (`ChatInputActions.tsx`, `UserProfilePanel.tsx`)
- Pages: PascalCase (`Auth.tsx`, `ServerView.tsx`)
- Utilities/hooks: camelCase with prefix for hooks (`usePresence.ts`, `uploadChatFile.ts`)
- Context files: PascalCase ending with Context (`AuthContext.tsx`, `VoiceChannelContext.tsx`)
- UI primitives: lowercase with hyphens (`button.tsx`, `dropdown-menu.tsx`)

**Functions:**
- Regular functions: camelCase (`fetchProfile`, `getUserStatus`, `isOnline`)
- React components: PascalCase (`ChatInputActions`, `MobileFilePicker`, `MobilePickerWrapper`)
- Custom hooks: camelCase with `use` prefix (`usePresence`, `useMessageReactions`, `useWebRTC`)
- Exported utilities: camelCase (`uploadChatFile`, `cn`, `playSound`)

**Variables:**
- Local state/constants: camelCase (`messageIds`, `activePicker`, `menuOpen`, `presenceMap`)
- Type/interface names: PascalCase (`ChatInputActionsProps`, `VoiceChannel`, `AuthContextType`)
- useState setters: `set` + PascalCase (`setMenuOpen`, `setActivePicker`, `setProfile`)
- Constants: camelCase or UPPER_SNAKE_CASE depending on visibility (`PAGE_SIZE = 30`, `MAX_FILE_SIZE`)

**Types:**
- Interfaces for props: `{ComponentName}Props` format (e.g., `interface ChatInputActionsProps`)
- Database types: Use `Tables<"table_name">` from Supabase types (e.g., `type Message = Tables<"messages">`)
- Context types: `{ContextName}Type` format (e.g., `AuthContextType`)
- Enum-like objects: `as const` pattern for type safety

## Code Style

**Formatting:**
- No explicit formatter configured (ESLint only, no Prettier)
- Use 2-space indentation (standard Vite/React setup)
- Semicolons used throughout
- Single quotes in strings where possible, but aligned with i18next translation calls

**Linting:**
- Tool: ESLint 9.32.0 + TypeScript ESLint
- Configuration: `eslint.config.js` (flat config format)
- Key rules:
  - `@typescript-eslint/no-unused-vars`: **OFF** (disabled intentionally)
  - `react-refresh/only-export-components`: warn (allows const exports)
  - React hooks recommended rules enforced
- TypeScript config (`tsconfig.json`) is **lenient**:
  - `strict: false`
  - `noImplicitAny: false`
  - `noUnusedLocals: false`
  - `strictNullChecks: false`

**Import Pattern:**
Always use path alias `@/` for imports from `src/`:
```typescript
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";
```

## Import Organization

**Order:**
1. External libraries (React, third-party packages)
2. Internal contexts/hooks (`@/contexts/`, `@/hooks/`)
3. Internal components (`@/components/`)
4. Utilities and types (`@/lib/`, `@/integrations/`)
5. Translations (late, often with `useTranslation()` call)

**Path Aliases:**
- `@/` → `src/`
- Configured in `tsconfig.json` and both Vite configs (`vite.config.ts`, `vitest.config.ts`)

**Example from `Chat.tsx`:**
```typescript
import React, { useEffect, useState, useRef, useCallback } from "react";
import { getEmojiClass } from "@/lib/emojiUtils";
import { renderLinkedText } from "@/lib/renderLinkedText";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
```

## Error Handling

**Patterns:**
- Try-catch blocks used for async operations, especially WebRTC and file uploads
- Errors often silently caught with `catch {}` or logged to console
- Context hooks throw Error if used outside provider: `if (!ctx) throw new Error("useAuth must be used within AuthProvider")`
- File upload errors passed to caller: `if (error) throw error;` in `uploadChatFile.ts`
- Promise `.catch()` chains used frequently: `audio.play().catch(() => {})`
- Supabase errors checked destructured: `const { data, error } = await supabase...`

**Example from `uploadChatFile.ts`:**
```typescript
export const uploadChatFile = async (
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
  // ...
  xhr.onload = () => {
    if (xhr.status >= 200 && xhr.status < 300) {
      const { data } = supabase.storage.from("chat-files").getPublicUrl(path);
      resolve(data.publicUrl);
    } else {
      reject(new Error(`Upload failed: ${xhr.status}`));
    }
  };
  xhr.onerror = () => reject(new Error("Upload failed"));
  // ...
};
```

**Example from `usePresence.ts`:**
```typescript
const getUserStatus = (profile: any): string => {
  if (!profile) return "offline";
  if (profile.status === "invisible") return "invisible";
  if (isOnline(profile.user_id)) return profile.status || "online";
  return "offline";
};
```

## Logging

**Framework:** `console` (no centralized logger)

**Patterns:**
- Error logs use console.error with descriptive prefixes: `console.error("[ErrorBoundary]", error, info.componentStack)`
- ErrorBoundary logs caught errors for debugging
- Silent failures in WebRTC and promise chains (many `.catch(() => {})` patterns)
- No request/response logging for Supabase calls

## Comments

**When to Comment:**
- Complex algorithms (e.g., WebRTC SDP optimization in `useWebRTC.ts`)
- Non-obvious behavior (e.g., "Use setTimeout to avoid Supabase deadlock" in AuthContext)
- Component intent when rendering is conditional (e.g., "Mobile/Tablet: single + button with action sheet")
- JSDoc comments for exported functions with parameters and return values

**JSDoc/TSDoc:**
Selective usage in utility functions:
```typescript
/**
 * Upload a file to the chat-files bucket and return its public URL.
 * Accepts an optional onProgress callback for tracking upload progress (0-100).
 */
export const uploadChatFile = async (
  userId: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<string> => {
```

```typescript
/**
 * Create an RTCPeerConnection with audio, wire up event handlers.
 * Does NOT create offer/answer — caller does that separately.
 */
```

Comments for color conversion functions in `ThemeContext.tsx`:
```typescript
/** Convert hex (#rrggbb) to HSL string "h s% l%" */
/** Calculate relative luminance of a hex color (0=black, 1=white) */
```

## Function Design

**Size:** Most functions 20–100 lines; larger components (Chat.tsx 759 lines, ChannelSidebar.tsx 1092 lines) break logic into smaller sub-components or helpers.

**Parameters:**
- Typed parameters with interfaces (e.g., `ChatInputActionsProps`)
- Props destructured in component signatures
- Optional props marked with `?`
- Avoid spreading props; be explicit

**Return Values:**
- React components return JSX
- Custom hooks return objects with named properties: `return { presenceMap, isOnline, getUserStatus }`
- Utility functions return single values or Promises
- Explicit type annotations on exported function returns

**Example from `usePresence.ts`:**
```typescript
export function usePresence() {
  // ...
  return { presenceMap, isOnline, getUserStatus };
}
```

## Module Design

**Exports:**
- Default export for React components: `export default ChatInputActions;`
- Named exports for hooks: `export function usePresence() { ... }` or `export const useMyHook = () => { ... }`
- Type exports: `export type Message = Tables<"messages">;` or via interface
- Utility function exports: `export const uploadChatFile = async (...) => { ... }`

**Barrel Files:**
Not heavily used. Components import directly:
```typescript
import ChatInputActions from "@/components/chat/ChatInputActions";
import { usePresence } from "@/hooks/usePresence";
```

**Context Provider Pattern:**
```typescript
// In context file:
const MyContext = createContext<MyContextType | undefined>(undefined);

export function MyProvider({ children }: { children: React.ReactNode }) {
  // provider logic
  return <MyContext.Provider value={...}>{children}</MyContext.Provider>;
}

export const useMyContext = () => {
  const ctx = useContext(MyContext);
  if (!ctx) throw new Error("useMyContext must be used within MyProvider");
  return ctx;
};
```

Used in `App.tsx`:
```typescript
<QueryClientProvider client={queryClient}>
  <ThemeProvider>
    <AudioSettingsProvider>
      <VoiceChannelProvider>
        <AuthProvider>
          {/* routes */}
        </AuthProvider>
      </VoiceChannelProvider>
    </AudioSettingsProvider>
  </ThemeProvider>
</QueryClientProvider>
```

## Translations

Every user-visible string has entries in both `src/i18n/en.ts` and `src/i18n/ar.ts`:

```typescript
// en.ts
myFeature: { title: "My Feature", action: "Do Thing" }

// ar.ts
myFeature: { title: "ميزتي", action: "افعل الشيء" }

// In component:
const { t } = useTranslation();
<h1>{t("myFeature.title")}</h1>
```

**Structure:** Flat or nested object keys (e.g., `"chat.emoji"`, `"files.upload"`).

## Array Dependencies

When an array is used as a `useEffect` dependency, convert to string to prevent infinite loops:

```typescript
useEffect(() => { /* ... */ }, [messageIds.join(",")]);
```

Not:
```typescript
useEffect(() => { /* ... */ }, [messageIds]); // BAD: new array each render
```

## TypeScript Strictness

Given lenient TypeScript config, use `as any` when:
- Supabase generated types don't match a complex query
- RPC calls return unexpected shapes
- Complex type intersections are needed

Avoid excessive type fighting; pragmatic typing is expected.

---

*Convention analysis: 2026-02-26*
