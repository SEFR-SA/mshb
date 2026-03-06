

## Plan: Fix Avatar Decoration Centering + Refactor Selectors into Modals with Search

### Phase 1: Fix Avatar Decoration Alignment

**File:** `src/components/shared/AvatarDecorationWrapper.tsx`

Replace the current inline `style` positioning (manual offset calc) with transform-based centering:

```tsx
<img
  src={decorationUrl}
  alt=""
  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 max-w-none"
  style={{ width: decorationSize, height: decorationSize }}
/>
```

This removes the manual `-offset` math and uses `top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2` to perfectly center the oversized decoration image regardless of container size.

### Phase 2: Refactor All Three Selectors into Modal-Based UIs

Each selector (`DecorationSelector`, `NameplateSelector`, `EffectSelector`) will be refactored from inline grids to:

1. **Summary trigger** — a compact button showing "Currently: [name]" or "None", with a lock icon if not Pro
2. **Dialog/Modal** on click containing:
   - Search `<Input>` at top filtering by asset `name`
   - Grid of selectable options (filtered)
   - Pro-gating preserved (toast on selection if not Pro)

All three follow the same pattern. The grid moves from ProfileTab inline into the modal body.

### Phase 3: Clean Up ProfileTab

**File:** `src/components/settings/tabs/ProfileTab.tsx`

No structural changes needed — the three `<DecorationSelector />`, `<NameplateSelector />`, `<EffectSelector />` components are already self-contained. Once refactored to show compact trigger buttons instead of inline grids, ProfileTab automatically becomes cleaner.

### Files Modified

| File | Change |
|------|--------|
| `AvatarDecorationWrapper.tsx` | Transform-based centering |
| `DecorationSelector.tsx` | Compact trigger + Dialog with search grid |
| `NameplateSelector.tsx` | Compact trigger + Dialog with search grid |
| `EffectSelector.tsx` | Compact trigger + Dialog with search grid |

