# Updating the Marketplace

The Marketplace is a curated in-app shop where Pro users can browse and equip cosmetic assets. All items are **hardcoded** — there is no admin CMS. To add new items, edit one file.

---

## Key File

`src/components/settings/tabs/MarketplaceTab.tsx` — contains the `MOCK_ITEMS` array.

---

## Item Object Shape

```typescript
{
  id: "unique_snake_case_id",          // must be unique across ALL categories
  name: "Display Name",                // shown in the marketplace card
  category: "avatar_decoration",       // see categories below
  thumbnail_url: "https://...",        // preview image shown in the card
  price: 0,                            // 0 = free for Pro users; >0 = paid (future use)
  isPro: true,                         // always true — all items are Pro-gated
}
```

### Categories

| `category` Value | What It Equips |
|-----------------|----------------|
| `"avatar_decoration"` | Avatar frame (from `src/lib/decorations.ts`) |
| `"nameplate"` | Identity row background (from `src/lib/nameplates.ts`) |
| `"profile_effect"` | Full-card animated overlay (from `src/lib/profileEffects.ts`) |

---

## Adding a New Item

### Step 1 — Add the asset to its config file first

Before adding to the Marketplace, the asset must be registered in the appropriate lib config file:
- Decorations → `src/lib/decorations.ts`
- Nameplates → `src/lib/nameplates.ts`
- Profile Effects → `src/lib/profileEffects.ts`

See the individual guide files in this folder for asset specs and registration steps.

### Step 2 — Add to `MOCK_ITEMS` in MarketplaceTab

```typescript
// In src/components/settings/tabs/MarketplaceTab.tsx
const MOCK_ITEMS = [
  // ... existing items ...
  {
    id: "my_new_decoration",
    name: "My New Decoration",
    category: "avatar_decoration",
    thumbnail_url: "https://cdn.example.com/decorations/my_new_decoration.png",
    price: 0,
    isPro: true,
  },
];
```

### Step 3 — Done

The Marketplace card renders automatically. The "Equip" button saves the item URL to:
- `profiles.avatar_decoration_url` for decorations
- `profiles.nameplate_url` for nameplates
- `profiles.profile_effect_url` for profile effects

---

## Adding a Bundle (Grouped Items)

A bundle is a collection of items sold/presented together. Currently bundles are display-only groupings in the UI. To add a bundle:

1. Add each item individually to `MOCK_ITEMS` as above
2. Add a bundle entry to the `BUNDLES` array (if it exists) or create a new section in the Marketplace UI

---

## Purchase & Equip Flow

```
User clicks "Equip"
  → supabase: INSERT INTO user_purchases (user_id, item_id)   [records ownership]
  → supabase: UPSERT INTO user_equipped (user_id, category, item_id)  [tracks active item]
  → AuthContext.refreshPurchases()   [refreshes purchasedItemIds + equippedItems]
  → Profile update: sets the URL column for that category
```

**AuthContext exports for checking ownership:**
- `purchasedItemIds: Set<string>` — IDs the user owns
- `equippedItems: Record<string, string>` — `{ category: item_id }` map

---

## DB Tables

| Table | Purpose |
|-------|---------|
| `user_purchases` | Records which items a user has purchased/unlocked |
| `user_equipped` | Tracks the currently-equipped item per category (PK: user_id + category) |
