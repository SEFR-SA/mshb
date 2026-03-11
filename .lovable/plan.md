

## Plan: Add "Rules Channel" Type

### How it works today
- Channels use a `type` column (`text` | `voice`) plus a boolean `is_announcement` flag
- `is_announcement` channels show a Megaphone icon, render read-only for non-admin/owner users
- The logic lives entirely in `ChannelSidebar.tsx` (creation, icon rendering) and `ServerChannelChat.tsx` (permission gating, header icon, read-only UI)

### Implementation

**1. Database Migration**
- Add `is_rules boolean NOT NULL DEFAULT false` to the `channels` table (mirrors `is_announcement` pattern)

**2. ChannelSidebar.tsx — Creation UI + Icon Rendering**
- Add `isRules` state (like `isAnnouncement`)
- Add a "Rules Channel" toggle with `BookOpen` icon below the announcement toggle (only for text channels). When toggled on, auto-disable `isAnnouncement` (and vice versa — they're mutually exclusive)
- Pass `is_rules: newType === "text" ? isRules : false` in the insert call
- Update the `Channel` interface to include `is_rules?: boolean`
- Update icon selection: `ch.is_private ? Lock : ch.is_rules ? BookOpen : ch.is_announcement ? Megaphone : ch.type === "voice" ? Volume2 : Hash`
- Pass `is_rules` through `onChannelSelect` callback
- Add `is_rules` to the channel fetch query select string
- Reset `isRules` on dialog close

**3. ServerChannelChat.tsx — Header + Permissions**
- Add `isRules?: boolean` to `Props`
- Update `canPost` logic: `const canPost = (!isAnnouncement && !isRules) || userRole === "admin" || userRole === "owner"`
- Update header icon: add `BookOpen` case for rules channels
- Add rules badge (like announcement badge) using a new translation key
- Add read-only footer bar for rules channels (same pattern as announcement read-only bar but with BookOpen icon)
- Admin/owner markdown toolbar applies to rules channels too

**4. ServerView.tsx**
- Add `is_rules` to the channel type interface and select queries
- Pass `isRules={activeChannel.is_rules}` to `ServerChannelChat`

**5. Translations (en.ts + ar.ts)**
- Add keys: `channels.rules`, `channels.rulesDesc`, `channels.rulesBadge`, `channels.rulesReadOnly`

### Files Modified
1. Migration SQL — `ALTER TABLE channels ADD COLUMN is_rules boolean NOT NULL DEFAULT false`
2. `src/components/server/ChannelSidebar.tsx` — creation toggle, icon, query, callback
3. `src/components/server/ServerChannelChat.tsx` — header, permissions, read-only bar
4. `src/pages/ServerView.tsx` — type + select + prop pass-through
5. `src/i18n/en.ts` + `src/i18n/ar.ts` — translation keys

### No Breaking Changes
- Existing channels default to `is_rules = false`
- Announcement logic is untouched

