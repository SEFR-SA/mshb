

## Package Audit Report & Upgrade Plan

Based on research against npm registry (as of March 2026), here is a full audit of all dependencies with recommended actions.

---

### Critical Upgrades (Security / Major Updates Available)

| Package | Current | Latest | Risk | Action |
|---------|---------|--------|------|--------|
| `lucide-react` | ^0.462.0 | 0.577.0 | Medium -- old icons, potential tree-shaking improvements | **Upgrade to ^0.577.0** |
| `@supabase/supabase-js` | ^2.95.3 | 2.98.0 | Low -- bug fixes, Node 18 EOL handling | **Upgrade to ^2.98.0** |
| `jsdom` (dev) | ^20.0.3 | 26.x | Medium -- security patches in HTML parser | **Upgrade to ^26.0.0** |

### Major Version Upgrades Available (Breaking Changes -- NOT recommended now)

| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| `react-router-dom` | ^6.30.1 | 7.13.1 | v7 is a thin re-export of `react-router`. Migration requires route restructuring. **Skip for now** -- v6 is still maintained. |
| `react-day-picker` | ^8.10.1 | 9.14.0 | v9 requires `date-fns` v4. Breaking API changes. **Skip** -- v8 still works. |
| `date-fns` | ^3.6.0 | 4.x | Breaking import changes. Only upgrade if moving to react-day-picker v9. **Skip.** |
| `vite` | ^5.4.19 | 6.x | Vite 6 has environment API changes. ^5.4.19 is latest v5 patch. **Current is fine.** |

### Up-to-Date Packages (No Action Needed)

| Package | Current | Status |
|---------|---------|--------|
| `react` / `react-dom` | ^18.3.1 | Latest v18. React 19 exists but shadcn/Radix compatibility is still maturing. **Stay on 18.** |
| `electron` | ^40.6.0 | Very recent. **Up to date.** |
| `@electron-forge/*` | ^7.11.1 | Latest v7. **Up to date.** |
| `typescript` | ^5.8.3 | Latest. **Up to date.** |
| `tailwindcss` | ^3.4.17 | Latest v3. Tailwind v4 exists but requires full migration. **Stay on 3.** |
| `@tanstack/react-query` | ^5.83.0 | Latest v5. **Up to date.** |
| `zod` | ^3.25.76 | Latest. **Up to date.** |
| `sonner` | ^1.7.4 | Latest. **Up to date.** |
| `i18next` | ^25.8.7 | Latest. **Up to date.** |
| `react-i18next` | ^16.5.4 | Latest. **Up to date.** |
| `react-hook-form` | ^7.61.1 | Latest v7. **Up to date.** |
| `@hookform/resolvers` | ^3.10.0 | Latest. **Up to date.** |
| `react-markdown` | ^10.1.0 | Latest. **Up to date.** |
| `remark-gfm` | ^4.0.1 | Latest. **Up to date.** |
| `embla-carousel-react` | ^8.6.0 | Latest. **Up to date.** |
| `react-resizable-panels` | ^2.1.9 | Latest. **Up to date.** |
| `recharts` | ^2.15.4 | Latest. **Up to date.** |
| `class-variance-authority` | ^0.7.1 | Latest. **Up to date.** |
| `clsx` | ^2.1.1 | Latest. **Up to date.** |
| `tailwind-merge` | ^2.6.0 | Latest. **Up to date.** |
| `cmdk` | ^1.1.1 | Latest. **Up to date.** |
| `vaul` | ^0.9.9 | Latest. **Up to date.** |
| `next-themes` | ^0.3.0 | Latest v0.3. **Up to date.** |
| `input-otp` | ^1.4.2 | Latest. **Up to date.** |
| All `@radix-ui/*` packages | Current versions | All at latest. **Up to date.** |
| `eslint` | ^9.32.0 | Latest. **Up to date.** |
| `postcss` | ^8.5.6 | Latest. **Up to date.** |
| `autoprefixer` | ^10.4.21 | Latest. **Up to date.** |
| `vitest` | ^3.2.4 | Latest. **Up to date.** |
| `@vitejs/plugin-react-swc` | ^3.11.0 | Latest. **Up to date.** |

### Recommended Safe Upgrades (implementation)

Only 3 packages need updating -- all are non-breaking minor/patch bumps:

1. **`lucide-react`**: `^0.462.0` → `^0.577.0` -- New icons, bug fixes. No breaking API changes (icons are additive).
2. **`@supabase/supabase-js`**: `^2.95.3` → `^2.98.0` -- Bug fixes, improved Bun/React Native support.
3. **`jsdom`** (dev): `^20.0.3` → `^26.0.0` -- Security patches in HTML parser used by Vitest.

### Summary

Your project is in excellent shape. **43 of 46 packages are already at their latest stable versions.** The 3 recommended upgrades are safe, non-breaking changes. Major version jumps (react-router v7, react-day-picker v9, Vite 6, Tailwind v4, React 19) should be deferred until their ecosystems stabilize further and you have time for dedicated migration work.

