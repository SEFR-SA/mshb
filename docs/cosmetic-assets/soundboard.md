# Adding Soundboard Sounds

Server soundboard sounds are short audio clips playable by server members in voice channels. They are managed per-server through the Server Settings → Soundboard tab.

---

## Asset Specs

| Property | Value |
|----------|-------|
| Format | **MP3** or **OGG** |
| Duration | ≤ 5 seconds recommended |
| File size | Keep under 512 KB |
| Sample rate | 44.1 kHz |

---

## How Sounds Are Added (User Flow)

Sounds are uploaded by **server admins** through the UI — they are NOT hardcoded in config files. Each sound is stored in the `server_soundboard` table.

**DB Table:** `server_soundboard`
| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `server_id` | UUID | FK to servers |
| `name` | TEXT | Display name |
| `url` | TEXT | Public URL of the audio file |
| `created_at` | TIMESTAMPTZ | Upload timestamp |

---

## How Sounds Are Played

Sounds are dispatched via a `CustomEvent` on `window`:

```typescript
window.dispatchEvent(new CustomEvent("play-soundboard", { detail: { url } }));
```

The `ChannelSidebar` soundboard button triggers this. The audio listener in `AppLayout` (or equivalent) picks it up and plays the sound.

---

## Adding Sounds Programmatically (Admin/Dev)

If you need to seed sounds directly into the DB:

```sql
INSERT INTO public.server_soundboard (server_id, name, url)
VALUES (
  'your-server-uuid',
  'Sound Name',
  'https://cdn.example.com/sounds/mysound.mp3'
);
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/components/server/ChannelSidebar.tsx` | Soundboard UI + play dispatch |
| `src/components/server/settings/SoundboardTab.tsx` | Upload/manage sounds in Server Settings |
