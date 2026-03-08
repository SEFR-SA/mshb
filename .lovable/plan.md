

## Plan: Hide Custom Theme Builder on Mobile

### Change

**File: `src/components/settings/tabs/AppearanceTab.tsx`**

1. Import `useIsMobile` from `@/hooks/use-mobile`
2. Call `const isMobile = useIsMobile()` inside the component
3. Wrap the Custom Theme Banner block (lines 111-140) and the `ThemeBuilder` overlay (line 219) in `{!isMobile && ...}` so both are completely hidden on mobile
4. The `showBuilder` state and handler can remain — they just won't be reachable on mobile

This is a ~3-line diff: one import, one hook call, and wrapping two JSX blocks.

### Files Changed
| File | Change |
|------|--------|
| `src/components/settings/tabs/AppearanceTab.tsx` | Import `useIsMobile`, hide Custom Theme Banner + ThemeBuilder on mobile |

