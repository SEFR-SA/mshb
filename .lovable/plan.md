

## Plan: Add Mutual Servers, Mutual Friends & "View Full Profile" to UserProfilePanel

### What changes

**`src/components/chat/UserProfilePanel.tsx`** — the side panel shown in DM chats.

#### 1. Accept `userId` prop (needed for fetching mutuals and opening full profile)

Add `userId: string` to `UserProfilePanelProps`. The parent (`Chat.tsx`) already has the other user's `user_id` available from `otherProfile.user_id`.

#### 2. Fetch mutual servers & mutual friends

Reuse the same query logic from `FullProfileModal`:
- Mutual friends: query both users' accepted friendships, intersect IDs, fetch profiles
- Mutual servers: query both users' `server_members`, intersect server IDs, fetch server info

Only fetch when `userId !== currentUser.id` (not self).

#### 3. Add collapsible sections below "Member Since"

Discord-style collapsible sections using `Collapsible` + `CollapsibleTrigger` + `CollapsibleContent`:

```text
┌─────────────────────────────┐
│ Mutual Servers — 5        ▾ │
│  [icon] Server Name         │
│  [icon] Server Name         │
│  ...                        │
├─────────────────────────────┤
│ Mutual Friends — 3        ▾ │
│  [avatar] Friend Name       │
│  ...                        │
└─────────────────────────────┘
```

Each section shows a count in the header and a chevron that rotates. Both default to collapsed.

#### 4. "View Full Profile" button at bottom

A full-width ghost/link button pinned at the bottom of the panel card that calls `openProfile(userId)` from `useUserProfile()`.

#### 5. Update `Chat.tsx` to pass `userId`

Pass `otherProfile.user_id` as the new `userId` prop to `UserProfilePanel`.

### Files changed

| File | Change |
|------|--------|
| `src/components/chat/UserProfilePanel.tsx` | Add mutual sections, collapsibles, View Full Profile button, fetch logic |
| `src/pages/Chat.tsx` | Pass `userId` prop to `UserProfilePanel` |

