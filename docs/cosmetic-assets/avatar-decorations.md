# Adding Avatar Decorations

Avatar decorations are animated or static frames that surround user avatars. They are a **Pro-only** feature displayed in 14+ locations across the app.

---

## Recommended Asset Specs

| Property | Value |
|----------|-------|
| Dimensions | **144 × 144 px** (or 288 × 288 px @2×) |
| Shape | Square with transparent background |
| Format | **APNG** or **WebP** (animated); **PNG** (static). Never GIF. |
| Content area | The center ~60% should be transparent so the avatar shows through |
| Frame thickness | Design frame to extend ~20% beyond the avatar circle edge |

The `AvatarDecorationWrapper` renders the decoration at **1.2× the avatar size**, centered over it. A 32 px avatar gets a ~38 px decoration, a 80 px avatar gets a ~96 px decoration, etc.

---

## Step-by-Step

### 1. Export the asset
- Export as **APNG** (for animation) or **PNG** (for static) with a transparent background.
- Dimensions must be square (144×144 or 288×288).

### 2. Host the file
Upload to Supabase Storage or a CDN. Copy the public URL.

### 3. Register in config

Open `src/lib/decorations.ts` and add a new entry to the exported array:

```typescript
export const DECORATIONS = [
  // ... existing entries ...
  {
    id: "my_new_decoration",       // unique snake_case ID
    name: "My New Decoration",     // display name shown in Marketplace
    url: "https://cdn.example.com/decorations/my_new_decoration.png",
    animated: true,                // true for APNG/WebP, false for static PNG
  },
];
```

### 4. Done — no component changes needed

The Marketplace UI and the `AvatarDecorationWrapper` component pick up new entries automatically.

---

## How the Wrapper Works

```tsx
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";

// size = the avatar size in px (integer)
<AvatarDecorationWrapper decorationUrl={profile.avatar_decoration_url} isPro={profile.is_pro} size={40}>
  <Avatar className="h-10 w-10">
    <AvatarImage src={profile.avatar_url || ""} />
    <AvatarFallback>MK</AvatarFallback>
  </Avatar>
</AvatarDecorationWrapper>
```

- The decoration renders at `size × 1.2` px, centered (`top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`).
- It sits at `z-10` so it appears above the avatar.
- **No `overflow: hidden`** — the decoration intentionally overflows the avatar bounds.
- If `isPro` is false the decoration is hidden (free users cannot display decorations).
- Use `isPro={true}` in preview/marketplace cards where you always want the decoration visible regardless of viewer Pro status.

---

## DB Column

`profiles.avatar_decoration_url` — stores the selected decoration URL as plain text.
