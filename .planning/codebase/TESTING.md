# Testing Patterns

**Analysis Date:** 2026-02-26

## Test Framework

**Runner:**
- Vitest 3.2.4
- Config: `vitest.config.ts`
- Environment: jsdom

**Assertion Library:**
- Vitest built-in expect() — compatible with Jest
- Testing Library (@testing-library/react 16.0.0, @testing-library/jest-dom 6.6.0)

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run test:watch       # Watch mode for development
npm run test:coverage    # Run with coverage (if configured)
```

## Test File Organization

**Location:**
- Co-located with source files: `src/test/` directory
- Currently: minimal test infrastructure

**Naming:**
- `.test.ts` or `.test.tsx` suffix for test files
- Example: `src/test/example.test.ts`

**Structure:**
```
src/test/
├── example.test.ts       # Example passing test
├── setup.ts              # Global test setup
```

## Test Structure

**Suite Organization:**
From `example.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

describe("example", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
```

**Patterns:**
- Use `describe()` to group related tests
- Use `it()` for individual test cases
- Use `expect()` for assertions
- Tests are synchronous or async (return Promise)

**Fixtures and Setup:**
Global setup file: `src/test/setup.ts`
```typescript
import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
```

This mocks `window.matchMedia` for CSS media query testing, essential for mobile-responsive component tests.

## Mocking

**Framework:**
Vitest has built-in mocking via `vi.mock()`, `vi.spyOn()`, `vi.fn()`.

**What to Mock:**
- External API calls (Supabase, browser APIs)
- File system operations (in Node test environment)
- Time-dependent behavior (use `vi.useFakeTimers()`)
- Browser APIs (already done in setup for `matchMedia`)

**What NOT to Mock:**
- React component rendering (use React Testing Library)
- i18next translations (import real translation files)
- Internal utility functions (test them directly unless they're expensive)
- React hooks from the standard library

**Pattern (recommended):**
```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { supabase } from "@/integrations/supabase/client";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn() },
  },
}));

describe("Chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch messages", async () => {
    const mockMessages = [{ id: "1", text: "Hello" }];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: mockMessages }),
      }),
    });

    // test code
  });
});
```

## Test Types

**Unit Tests:**
- Scope: Single function or component in isolation
- Approach: Test behavior with mocked dependencies
- Files: `src/lib/*.test.ts` for utilities, `src/hooks/*.test.ts` for custom hooks
- Example: Testing `uploadChatFile()` with mocked Supabase storage

**Integration Tests:**
- Scope: Multiple components or functions working together
- Approach: Mock external APIs but test real internal logic
- Files: `src/pages/*.test.tsx` for full page behavior
- Example: Testing Chat page with mocked Supabase, but real message components

**E2E Tests:**
- Framework: **Not currently used**
- If adding: Consider Playwright or Cypress (not configured)
- Would test: Full user journeys (login → send message → receive → logout)

## Coverage

**Requirements:** None enforced

**Current State:**
- Only one example test exists (`example.test.ts`)
- No coverage threshold configured
- Coverage reports not generated in CI

**View Coverage (if configured):**
```bash
npm run test -- --coverage
```

## Common Patterns

**Async Testing:**
Vitest handles async/await naturally:
```typescript
import { describe, it, expect } from "vitest";

describe("async operations", () => {
  it("should handle promises", async () => {
    const result = await someAsyncFunction();
    expect(result).toBe("expected");
  });
});
```

**Error Testing:**
```typescript
describe("error handling", () => {
  it("should throw on invalid input", () => {
    expect(() => riskyFunction(null)).toThrow("Invalid input");
  });

  it("should reject promise on error", async () => {
    await expect(asyncRiskyFunction()).rejects.toThrow("Network error");
  });
});
```

**Component Testing (with React Testing Library):**
```typescript
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ChatInputActions from "@/components/chat/ChatInputActions";

describe("ChatInputActions", () => {
  it("renders file attachment button", () => {
    render(
      <ChatInputActions
        onFileSelect={vi.fn()}
        onEmojiSelect={vi.fn()}
        onGifSelect={vi.fn()}
        onStickerSelect={vi.fn()}
      />
    );
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
```

**Mocking useTranslation:**
```typescript
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));
```

## Configuration Files

**vitest.config.ts:**
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    environment: "jsdom",           // DOM testing environment
    globals: true,                  // Vitest globals available without import
    setupFiles: ["./src/test/setup.ts"],  // Run setup before tests
    include: ["src/**/*.{test,spec}.{ts,tsx}"],  // Test file pattern
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },  // Path alias for tests
  },
});
```

**Key Settings:**
- `environment: "jsdom"` — Simulate browser DOM (needed for React component tests)
- `globals: true` — `describe`, `it`, `expect` available without explicit import
- `setupFiles` — Global setup runs before all tests (where mocks are configured)
- `include` — Pattern for discovering test files anywhere in `src/`

## Test Structure Recommendations

**For New Features:**

1. **Create test file** next to source:
   - Component: `src/components/chat/MyComponent.test.tsx`
   - Hook: `src/hooks/useMyHook.test.ts`
   - Utility: `src/lib/myUtil.test.ts`

2. **Import test utilities:**
   ```typescript
   import { describe, it, expect, beforeEach, vi } from "vitest";
   import { render, screen, fireEvent } from "@testing-library/react";
   import userEvent from "@testing-library/user-event"; // if testing user interactions
   ```

3. **Mock Supabase if needed:**
   ```typescript
   vi.mock("@/integrations/supabase/client");
   vi.mock("@/contexts/AuthContext", () => ({
     useAuth: () => ({ user: { id: "test" }, profile: null }),
   }));
   ```

4. **Test error cases:** Invalid inputs, network failures, missing data

5. **Test async behavior:** Use `.rejects` or `await` promises

## Known Limitations

- **No E2E tests** — Would need Playwright or Cypress setup
- **No API mocking strategy** — Supabase mocks must be set up per test file
- **No test data factories** — Create test data inline or in `src/test/fixtures.ts` (doesn't exist yet)
- **No coverage enforcement** — CI doesn't fail on low coverage
- **Mobile testing** — Use `useIsMobile()` mocks or render with different viewport sizes via Testing Library

## Testing Environment Setup

**Browser Globals:**
jsdom provides window, document, localStorage, etc. Custom polyfills in `src/test/setup.ts`:
- `window.matchMedia` — CSS media queries

**Path Resolution:**
- `@/` alias configured in `vitest.config.ts`
- Import styles the same way as in source files

**React/i18next:**
- React Testing Library available for component tests
- i18next real translations can be imported or mocked per test
- Providers (Auth, Theme, etc.) must be wrapped when testing hooks

---

*Testing analysis: 2026-02-26*
