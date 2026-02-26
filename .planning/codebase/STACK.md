# Technology Stack

**Analysis Date:** 2026-02-26

## Languages

**Primary:**
- TypeScript 5.8.3 - Core application codebase, React components, hooks, utilities
- JavaScript (ES2020) - Vite configuration, build tooling, Electron main process

**Secondary:**
- SQL - Supabase migrations and RLS policies in `supabase/migrations/`
- HTML/CSS - Via React components styled with Tailwind CSS

## Runtime

**Environment:**
- Node.js (LTS recommended) - Development and build
- Browser (Chrome/Firefox/Safari/Edge) - Web app runtime
- Electron 40.6.0 - Desktop application runtime (optional, includes Chromium)

**Package Manager:**
- npm 10+ (bundled with Node.js)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- React 18.3.1 - UI component framework
- React Router 6.30.1 - SPA routing (HashRouter for Electron compatibility)
- Vite 5.4.19 - Build tool and dev server (faster than Webpack)

**UI/Component Library:**
- Radix UI (via `@radix-ui/*`) - Accessible primitives (Dialog, Dropdown, etc.)
- shadcn-ui - Pre-built components built on Radix UI in `src/components/ui/`
- Tailwind CSS 3.4.17 - Utility-first CSS framework with dark mode support
- Lucide React 0.462.0 - Icon library

**Form & Validation:**
- react-hook-form 7.61.1 - Form state management
- Zod 3.25.76 - Schema validation and type inference

**State Management:**
- React Context API - Authentication, theme, voice channel, audio settings (four providers in `src/contexts/`)
- Direct Supabase client calls - No Redux/Zustand, data fetched inside `useEffect` hooks

**Internationalization:**
- i18next 25.8.7 - i18n framework
- react-i18next 16.5.4 - React integration
- i18next-browser-languagedetector 8.2.1 - Auto-detect language from browser

**Real-time & Communication:**
- Supabase Realtime - WebSocket subscriptions for live updates (messages, presence, reactions)
- WebRTC - Peer-to-peer voice/video calling via custom `useWebRTC` hook in `src/hooks/useWebRTC.ts`

**Testing:**
- Vitest 3.2.4 - Test runner (Vite-native, faster than Jest)
- @testing-library/react 16.0.0 - React component testing
- @testing-library/jest-dom 6.6.0 - DOM matchers

**Build & Dev:**
- @vitejs/plugin-react-swc 3.11.0 - Faster React JSX compilation via SWC
- lovable-tagger 1.1.13 - Component tagging (development only)

**Desktop (Optional):**
- Electron 40.6.0 - Desktop app framework
- @electron-forge 7.11.1 - Electron packaging and distribution
- electron-squirrel-startup 1.0.1 - Windows installer support

**Other Key Dependencies:**
- @tanstack/react-query 5.83.0 - Installed but not actively used; data fetching uses Supabase client directly
- date-fns 3.6.0 - Date formatting and manipulation
- recharts 2.15.4 - Charting (if present in components)
- react-markdown 10.1.0 - Markdown rendering
- remark-gfm 4.0.1 - GitHub Flavored Markdown support
- embla-carousel-react 8.6.0 - Carousel component
- react-resizable-panels 2.1.9 - Resizable panel layouts
- sonner 1.7.4 - Toast notification library
- vaul 0.9.9 - Drawer/sheet component
- next-themes 0.3.0 - Theme provider for light/dark/custom themes
- class-variance-authority 0.7.1 - CSS-in-JS utilities
- clsx 2.1.1 - Conditional class utility
- cmdk 1.1.1 - Command menu/search component
- input-otp 1.4.2 - OTP input component
- react-day-picker 8.10.1 - Date picker component
- tailwind-merge 2.6.0 - Merge Tailwind classes without conflicts
- tailwindcss-animate 1.0.7 - Animation plugin for Tailwind

## Configuration

**TypeScript:**
- Config: `tsconfig.json` + `tsconfig.app.json` + `tsconfig.node.json`
- Strict mode: Disabled (`strict: false`)
- `noImplicitAny`: false (lenient typing allowed)
- `noUnusedLocals`: false
- `strictNullChecks`: false
- Path alias: `@/*` maps to `src/*`

**Vite:**
- Config: `vite.config.ts`
- Dev server: Runs on `http://[::]:8080` with HMR overlay disabled
- Base path: `./` for Electron, `/` for web
- Uses React SWC plugin for faster JSX compilation
- Component tagging enabled in development mode

**Tailwind:**
- Config: `tailwind.config.ts`
- Dark mode: Class-based (`.dark` prefix)
- Custom fonts: Inter (default), Noto Naskh Arabic (RTL support)
- Custom colors: Sidebar colors, online status indicator, custom theme variables
- Plugins: tailwindcss-animate

**ESLint:**
- Config: `eslint.config.js` (flat config format)
- Extends: `@eslint/js` recommended + TypeScript ESLint rules
- Plugins: react-hooks (enforces Rules of Hooks), react-refresh (warns on export violations)
- Notable rules: `@typescript-eslint/no-unused-vars` turned off

**PostCSS:**
- Config: `postcss.config.js`
- Plugins: Autoprefixer (vendor prefixes), Tailwind CSS

**Vitest:**
- Config: `vitest.config.ts`
- Test environment: jsdom (browser-like)
- Globals: true (describe/it/expect available without imports)
- Setup files: `src/test/setup.ts`
- Test file pattern: `src/**/*.{test,spec}.{ts,tsx}`

## Environment Variables

**Required (Supabase):**
- `VITE_SUPABASE_URL` - Supabase project URL (default in vite.config.ts)
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key (default in vite.config.ts)
- `VITE_SUPABASE_PROJECT_ID` - Project identifier (derived)

**Optional:**
- `VITE_URL_REGEX` - URL validation pattern (for message link detection)
- `ELECTRON` - Set to 'true' when running Electron desktop app
- `GIPHY_API_KEY` - Set server-side in Supabase for giphy-proxy edge function

**Storage:**
- Loaded from `.env` (local development) or Vercel environment (production)
- Never committed to git; use `.env.example` for documentation

## Platform Requirements

**Development:**
- Node.js 16+ (npm 7+)
- Git for version control
- (Optional) Electron for desktop development

**Production - Web:**
- Deployment: Vercel (with `vercel.json` SPA rewrite config)
- Hosting: Static hosting (SPA, all routes rewrites to `/index.html`)
- CDN: Automatic via Vercel

**Production - Desktop:**
- Platform-specific installers via electron-forge
- Supports Windows (NSIS installer via squirrel), macOS, Linux
- Auto-update capability via electron-forge publisher

**Browsers:**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- (PWA capability via Service Worker, no manifest.json currently)

---

*Stack analysis: 2026-02-26*
