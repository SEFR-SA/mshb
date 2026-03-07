# Adding Nameplates

Nameplates are wide banner images rendered as the background of user identity rows (DM list, friend list, server members sidebar, settings). They are a **Pro-only** feature.

---

## Recommended Asset Specs

| Property | Value |
|----------|-------|
| Dimensions | **600 × 80 px** (or 1200 × 160 px @2×) |
| Aspect ratio | ~7.5:1 wide banner |
| Format | **APNG** or **WebP** (animated); **PNG** (static). Never GIF. |
| Background | Can be opaque or semi-transparent — it sits behind the avatar + name |
| Safe zone | Keep important content away from the left ~48 px (avatar area) and right ~8 px edges |

---

## Step-by-Step

### 1. Export the asset
Export as **APNG** (animated) or **PNG** (static) at 600×80 px or 1200×160 px.

### 2. Host the file
Upload to Supabase Storage or a CDN. Copy the public URL.

### 3. Register in config

Open `src/lib/nameplates.ts` and add a new entry:

```typescript
export const NAMEPLATES = [
  // ... existing entries ...
  {
    id: "my_nameplate",
    name: "My Nameplate",
    url: "https://cdn.example.com/nameplates/my_nameplate.png",
    animated: false,
  },
];
```

### 4. Done — no component changes needed

---

## How the Wrapper Works

```tsx
import NameplateWrapper from "@/components/shared/NameplateWrapper";

<NameplateWrapper nameplateUrl={profile.nameplate_url} isPro={profile.is_pro} className="rounded-md">
  <div className="flex items-center gap-2 p-2">
    {/* avatar, name, etc. */}
  </div>
</NameplateWrapper>
```

- The nameplate renders as a `background-image` on the wrapper element.
- If `isPro` is false the nameplate is hidden.
- Add `className` to control border-radius on the container.

---

## DB Column

`profiles.nameplate_url` — stores the selected nameplate URL as plain text.
