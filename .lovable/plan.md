

# Community Servers — Phase 1 & 2 Plan

## Overview

Add `is_community` flag to servers, with enable/disable RPCs, a settings tab with promotional view, setup modal, and management view.

---

## Step 1: Database Migration

```sql
ALTER TABLE public.servers
  ADD COLUMN is_community BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN rules_channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
  ADD COLUMN public_updates_channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL;
```

No new RLS needed — existing `servers` policies cover reads/writes.

---

## Step 2: RPCs (SECURITY DEFINER)

**`enable_community(p_server_id, p_rules_channel_id, p_updates_channel_id)`:**
1. Verify caller is server owner
2. If `p_rules_channel_id` is NULL → create channel `rules` (type='text', is_rules=true) → use new ID
3. If `p_updates_channel_id` is NULL → create channel `announcements` (type='text', is_announcement=true) → use new ID
4. UPDATE servers SET is_community=true, rules_channel_id, public_updates_channel_id

**`disable_community(p_server_id)`:**
1. Verify caller is owner
2. UPDATE servers SET is_community=false (keep channel references intact)

---

## Step 3: ServerSettingsDialog Updates

- Add `"community"` to `TabId` union
- Add `isCommunity` state, load from server data
- Add sidebar tab: dynamic label based on `isCommunity` — "Enable Community" (Crown icon) or "Community Settings"
- Only visible to server owner
- Render new `CommunityTab` component based on `isCommunity` state

---

## Step 4: New `CommunityTab.tsx` Component

Single component with two modes:

**When `is_community = false` (Promotional View):**
- Hero title/subtitle encouraging conversion
- "Enable Community" primary button → opens setup modal
- 3-column feature grid cards (Announcement, Tickets, Rules) with Lucide icons

**When `is_community = true` (Management View):**
- Dropdowns to change rules/announcements channel (fetches server channels)
- Save via direct UPDATE on servers table
- Danger Zone: "Disable Community" red button → AlertDialog → calls `disable_community` RPC

---

## Step 5: Setup Modal (`EnableCommunityModal.tsx`)

Wide Dialog with 2-column layout:
- **Left**: Decorative — title + abstract illustration/icons
- **Right**: Form with two Select dropdowns (existing channels + "Create one for me" option)
- Submit calls `enable_community` RPC
- On success: update local state, close modal, show toast

---

## Step 6: Realtime

Already handled — `ServerSettingsDialog` subscribes to `postgres_changes` on the `servers` table filtered by server ID. When `is_community` changes, `loadServerData()` re-fires and UI updates.

---

## Step 7: Translations

Add keys to `en.ts` and `ar.ts` under `community` namespace:
- `title`, `subtitle`, `enableButton`, `disableButton`, `disableConfirmTitle`, `disableConfirmDesc`, `setupTitle`, `setupSubtitle`, `rulesChannel`, `updatesChannel`, `createForMe`, `featureAnnouncements`, `featureTickets`, `featureRules`, `enabled`, `disabled`, `settingsTitle`

---

## Files Modified/Created

1. **Migration SQL** — 3 columns + 2 RPCs
2. `src/components/server/ServerSettingsDialog.tsx` — new tab + state
3. `src/components/server/settings/CommunityTab.tsx` — **new file**
4. `src/components/server/EnableCommunityModal.tsx` — **new file**
5. `src/i18n/en.ts` + `src/i18n/ar.ts` — translation keys

