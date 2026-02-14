## Multi-Feature Update

### 1. Camera Source Quality + Anti-Downscaling

Update camera `getUserMedia` constraints to request 1080p/60fps and configure RTP sender encoding to prevent downscaling -- same pattern already used for screen share.

**Files:** `src/components/server/VoiceConnectionBar.tsx`, `src/hooks/useWebRTC.ts`

- Change `getUserMedia({ video: true })` to `getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 60 } } })`
- After `pc.addTrack` for camera senders, configure `maxBitrate: 4_000_000` and `degradationPreference: "maintain-resolution"`
- Apply same config in `createPeerConnection` when adding existing camera tracks to new peers (VoiceConnectionBar line ~116)

---

### 2. File Upload Limit: 10 MB --> 200 MB

Update `MAX_FILE_SIZE` constant in all four locations:

- `src/components/chat/FileAttachmentButton.tsx` (line 7)
- `src/pages/Chat.tsx` (line 35)
- `src/pages/GroupChat.tsx` (line 31)
- `src/components/server/ServerChannelChat.tsx` (line 22)

Change from `10 * 1024 * 1024` to `200 * 1024 * 1024`. The existing progress bar logic in `uploadChatFile.ts` (XHR with `onProgress`) already handles large uploads smoothly -- no changes needed there.

---

### 3. Allow .gif Uploads for Avatars and Banners

All avatar/banner upload inputs already use `accept="image/*"`, which includes GIF files by default in all browsers. No code changes are needed -- GIF uploads already work. The files are stored via Supabase Storage which serves them as-is, preserving animation.

---

### 4. Accent Color Picker in Settings

Add a color picker to the Settings page that lets users choose the app's primary accent color (the `--primary` CSS variable).

**Files:**

- `src/contexts/ThemeContext.tsx` -- Add `accentColor` state (persisted to localStorage), expose `setAccentColor`. On change, update `--primary` (and `--ring`, `--sidebar-primary`, `--sidebar-ring`) on `document.documentElement.style` using HSL values.
- `src/pages/Settings.tsx` -- Add a color picker row (using a native `<input type="color">`) in the appearance card. Convert hex to HSL for the CSS variable. Save preference to the user's profile.
- `src/i18n/en.ts` and `src/i18n/ar.ts` -- Add translation key `profile.accentColor`.

Default presets offered as clickable swatches: deep green (current), blue, purple, red, orange, teal. Plus a custom color input.

---

### 5. Message Input: 2,000 --> 5,000 Characters

Update `maxLength={2000}` to `maxLength={5000}` in three files:

- `src/pages/Chat.tsx` (line 553)
- `src/pages/GroupChat.tsx` (line 478)
- `src/components/server/ServerChannelChat.tsx` (line 331)

---

### 6. Remove Server Join Limits

There are no hardcoded server join limits in the codebase. The `JoinServerDialog` simply inserts into `server_members` without any count check. No changes needed.

---

### Summary of Files Modified


| File                                           | Changes                                   |
| ---------------------------------------------- | ----------------------------------------- |
| `src/components/server/VoiceConnectionBar.tsx` | Camera constraints + sender encoding      |
| `src/hooks/useWebRTC.ts`                       | Camera constraints + sender encoding      |
| `src/components/chat/FileAttachmentButton.tsx` | 200 MB limit                              |
| `src/pages/Chat.tsx`                           | 200 MB limit + 5,000 char maxLength       |
| `src/pages/GroupChat.tsx`                      | 200 MB limit + 5,000 char maxLength       |
| `src/components/server/ServerChannelChat.tsx`  | 200 MB limit + 5,000 char maxLength       |
| `src/contexts/ThemeContext.tsx`                | Accent color state + CSS variable updates |
| `src/pages/Settings.tsx`                       | Color picker UI with presets              |
| `src/i18n/en.ts`                               | Translation key for accent color          |
| `src/i18n/ar.ts`                               | Translation key for accent color          |
