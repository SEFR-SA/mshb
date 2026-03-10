

## Fix Plan: 4 Issues on Server Boost Page

### Issue 1 & 2: Hide UserPanel and ServerRail on boost page

In `AppLayout.tsx`, the `location` is already available. Add a check for the boost page route:
```ts
const isBoostPage = /\/server\/[^/]+\/boost/.test(location.pathname);
```
- Wrap ServerRail render with `!isBoostPage` (line 105)
- Wrap both UserPanel renders with `!isBoostPage` (lines 108-113)

### Issue 3: Duplicate boost count ("9 9 boosts")

Line 173 of `ServerBoostPage.tsx`:
```tsx
🔮 {boostCount} {t("serverBoost.boostCount", { count: boostCount })}
```
The i18n key `boostCount` already contains `"{{count}} boosts"`, so `{boostCount}` before it creates duplication. Fix: remove the extra `{boostCount}`.

### Issue 4: Cannot scroll

The page renders inside AppLayout's `<div className="flex-1 overflow-hidden">` (line 116). The boost page uses `min-h-screen overflow-y-auto` but the parent clips it. Fix: change the boost page's root div from `min-h-screen` to `min-h-full h-full` and add `overflow-y-auto` to ensure it scrolls within the constrained parent.

### Files to modify
- `src/components/layout/AppLayout.tsx` — add `isBoostPage` check to hide ServerRail and UserPanel
- `src/pages/ServerBoostPage.tsx` — remove duplicate `{boostCount}`, fix scroll container class

