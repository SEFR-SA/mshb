# Adding Profile Effects

Profile effects are full-card animated overlays that appear on top of the user profile modal/panel. They are a **Pro-only** feature rendered at `z-50`.

---

## Recommended Asset Specs

| Property | Value |
|----------|-------|
| Dimensions | **480 × 880 px** (or 960 × 1760 px @2×) |
| Aspect ratio | ~0.55:1 portrait |
| Format | **APNG** or **WebP** (animated). Never GIF. |
| Background | Must be transparent — the effect overlays the profile card content |
| Loops | Should loop seamlessly |

---

## Step-by-Step

### 1. Export the asset
Export as **APNG** or animated **WebP** at 480×880 px with a transparent background.

### 2. Host the file
Upload to Supabase Storage or a CDN. Copy the public URL.

### 3. Register in config

Open `src/lib/profileEffects.ts` and add a new entry:

```typescript
export const PROFILE_EFFECTS = [
  // ... existing entries ...
  {
    id: "my_effect",
    name: "My Effect",
    url: "https://cdn.example.com/effects/my_effect.png",
    animated: true,
  },
];
```

### 4. Done — no component changes needed

---

## How the Wrapper Works

```tsx
import ProfileEffectWrapper from "@/components/shared/ProfileEffectWrapper";

<ProfileEffectWrapper effectUrl={profile.profile_effect_url} isPro={profile.is_pro} className="relative">
  {/* profile card content */}
</ProfileEffectWrapper>
```

- The effect `<img>` is absolutely positioned at `z-50`, covering the entire wrapper.
- It uses `pointer-events-none` so it doesn't block interactions.
- If `isPro` is false, the effect is hidden.
- Used in: `UserProfileModal`, `UserProfilePanel`, `FullProfileModal`, `ServerMemberList` popup.

---

## DB Column

`profiles.profile_effect_url` — stores the selected effect URL as plain text.
