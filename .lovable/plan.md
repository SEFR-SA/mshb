

## Fix Plan: Restore Member List Interactions + Update Assets

### Root Cause

The `NameplateWrapper` component breaks Radix UI's `asChild` ref-forwarding chain. In `ServerMemberList.tsx` (desktop, lines 401-418), the structure is:

```text
ContextMenuTrigger asChild
  └─ PopoverTrigger asChild
       └─ NameplateWrapper (div) ← breaks ref chain
            └─ button
```

Radix `asChild` uses `Slot` which needs to forward refs through each layer. `NameplateWrapper` is a plain functional component that doesn't forward refs, so **both the click (Popover) and right-click (ContextMenu) handlers never reach the button**.

### Fix 1: Make NameplateWrapper forward refs (1 file)

**`src/components/shared/NameplateWrapper.tsx`** — Convert to `React.forwardRef` and spread rest props (`...rest`) onto the outer `<div>`. This allows Radix's `Slot` to properly attach click/context-menu handlers and refs through the wrapper.

### Fix 2: Replace placeholder assets with real URLs (3 files)

**`src/lib/decorations.ts`** — Remove all 6 placeholder entries. Replace with:
- Glitch Effect (`a_e90ebc0114e7bdc30353c8b11953ea41`)
- Golden Crown (`a_65db91cee351e36150a2b506b26eba71`)
- Floating Hearts (`a_3e1fc3c7ee2e34e8176f4737427e8f4f`)
- Sakura Blossoms (`a_13913a00bd9990ab4102a3bf069f0f3f`)

All four marked `animated: true`.

**`src/lib/nameplates.ts`** — Remove all 6 placeholder entries. Leave the array empty (`[]`).

**`src/lib/profileEffects.ts`** — Remove all 6 placeholder entries. Replace with:
- Earthquake Effect (`https://cdn.discordapp.com/assets/profile_effects/effects/2e46d5d2d9e/earthquake/loop.png`)

### Summary of changes

| File | Change |
|------|--------|
| `NameplateWrapper.tsx` | Add `forwardRef` + spread rest props |
| `decorations.ts` | Replace placeholders with 4 real Discord CDN URLs |
| `nameplates.ts` | Clear array (empty `[]`) |
| `profileEffects.ts` | Replace placeholders with 1 real earthquake effect |

