# Cosmetic Assets — Developer Guides

This folder contains step-by-step guides for adding and managing all curated cosmetic assets in MSHB.

---

## Guides

| File | Topic |
|------|-------|
| [avatar-decorations.md](./avatar-decorations.md) | Animated/static avatar frames |
| [nameplates.md](./nameplates.md) | Identity row background banners |
| [profile-effects.md](./profile-effects.md) | Full-card animated overlays |
| [display-name-fonts.md](./display-name-fonts.md) | Custom fonts and text effects for display names |
| [server-tags.md](./server-tags.md) | Server tag badges and icons |
| [soundboard.md](./soundboard.md) | Server voice channel soundboard sounds |
| [marketplace.md](./marketplace.md) | Adding items and bundles to the Marketplace |

---

## Asset Size Quick Reference

| Asset | Dimensions | Format |
|-------|-----------|--------|
| Avatar Decoration | 128×128 px (256×256 @2×) | APNG / WebP / PNG |
| Nameplate | 600×80 px (1200×160 @2×) | APNG / WebP / PNG |
| Profile Effect | 440×580 px (880×1160 @2×) | APNG / WebP |
| Soundboard Sound | Any duration ≤5s | MP3 / OGG |
| Badge Icon | SVG (any size, viewBox-based) | SVG component |

---

## Config Files Quick Reference

| Asset Type | Config File |
|-----------|-------------|
| Avatar Decorations | `src/lib/decorations.ts` |
| Nameplates | `src/lib/nameplates.ts` |
| Profile Effects | `src/lib/profileEffects.ts` |
| Marketplace Items | `src/components/settings/tabs/MarketplaceTab.tsx` → `MOCK_ITEMS` |
| Badge Icons | `src/components/ServerTagBadgeIcon.tsx` + `src/components/server/settings/ServerTagTab.tsx` |

---

## Golden Rules

1. **Never use GIF** — always APNG or WebP for animation.
2. **All cosmetic assets are Pro-only** — the wrapper components enforce this via `isPro` prop.
3. **Use `isPro={true}` only in marketplace preview cards** — everywhere else read from `profile.is_pro`.
4. **Always use the shared wrapper components** — never render decorations, nameplates, or effects with raw CSS. See `CLAUDE.md` → Single Source of Truth mandate.
