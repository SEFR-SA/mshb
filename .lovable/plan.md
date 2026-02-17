

## Dynamic Invite Link System

### Overview
Replace the static invite code on servers with a full invite link system supporting expiration, usage limits, friend DM sending, and a Discord-style invite modal with settings sub-view.

---

### 1. Database Migration

**New `invites` table:**

| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | Default `gen_random_uuid()` |
| server_id | uuid (NOT NULL) | References the server |
| creator_id | uuid (NOT NULL) | The user who created it |
| code | text (UNIQUE, NOT NULL) | 8-char random string via `generate_invite_code()` |
| expires_at | timestamptz | Nullable; default `now() + interval '7 days'` |
| max_uses | integer | Nullable (null = unlimited) |
| use_count | integer | Default 0 |
| temporary | boolean | Default false (grant temporary membership) |
| created_at | timestamptz | Default `now()` |

**RLS Policies:**
- SELECT: server members can view invites for their servers
- INSERT: server members can create invites for their servers
- UPDATE: creator can update their own invites
- DELETE: creator or server admin can delete invites

**New DB function `get_server_id_by_invite_link(p_code text)`:**
- Replaces the old `get_server_id_by_invite` logic
- Checks `expires_at` and `use_count < max_uses` (or `max_uses IS NULL`)
- Returns `server_id` if valid, NULL if expired/exhausted
- A second function `use_invite(p_code text)` increments `use_count` atomically

**Add `/invite/:code` route** in `App.tsx` that redirects to a join flow or shows "Invalid Invite" if the code is expired/full.

Enable realtime on the `invites` table.

---

### 2. New Invite Modal Component (`InviteModal.tsx`)

**Trigger:** The existing Copy icon button next to the server name in `ChannelSidebar.tsx` (line 517) will open this modal instead of copying the old static code.

**Main View:**
- Title: "Invite friends to [Server Name]"
- Search bar to filter friends list
- Scrollable list of the user's accepted friends, each with avatar, name, and a "Send Link" button
  - "Send Link" creates (or reuses) a DM thread and sends a message containing the invite URL
  - Button changes to "Sent" after sending
- Bottom section: generated link box showing `mshb.lovable.app/invite/[code]` with a "Copy" button
- Footer text: "Your invite link expires in 7 days. Edit invite link." where "Edit invite link" is clickable

**Settings Sub-View (slides in):**
- Back button to return to main view
- "Expire After" dropdown: 1 hour, 6 hours, 12 hours, 1 day, 7 days
- "Max Number of Uses" dropdown: No limit, 1, 5, 10, 25
- "Grant Temporary Membership" toggle switch
- When any setting changes and user goes back (or auto-save), generate a new invite code with the selected constraints, update the displayed link

---

### 3. Update Join Flow (`JoinServerDialog.tsx` and new `/invite/:code` route)

- Add a new page/component `InviteJoin.tsx` for the `/invite/:code` route
- On load, call `get_server_id_by_invite_link(code)` to validate
- If valid: show server name and a "Join" button; on join, call `use_invite(code)` to increment use_count, insert into `server_members`, navigate to server
- If invalid: show "Invite Invalid" error (expired or max uses reached)
- Update `JoinServerDialog.tsx` to also accept full URLs (extract code from `mshb.lovable.app/invite/[code]` format)

---

### 4. Update Existing References

- `ChannelSidebar.tsx`: Change the Copy button to open the new InviteModal instead of copying the static code
- `ServerSettingsDialog.tsx`: Update invite code section to show the new invite link format and link to the modal
- `ServerRail.tsx`: Update context menu "Copy Invite" to generate/use a dynamic invite link

---

### 5. Files Summary

| File | Action |
|------|--------|
| Database migration | Create `invites` table, RLS, functions |
| `src/App.tsx` | Add `/invite/:code` route |
| `src/components/server/InviteModal.tsx` | **New** -- main invite modal with friends list + settings |
| `src/pages/InviteJoin.tsx` | **New** -- handles `/invite/:code` join page |
| `src/components/server/ChannelSidebar.tsx` | Replace copy button with modal trigger |
| `src/components/server/ServerSettingsDialog.tsx` | Update invite code display |
| `src/components/server/ServerRail.tsx` | Update context menu invite action |
| `src/components/server/JoinServerDialog.tsx` | Support URL-based invite codes |

