

# Friends System and Group Chats

## Overview
Two major new features: (1) a Friends system for adding/accepting/removing friends, and (2) Group Chats with naming and admin roles.

---

## Feature 1: Friends System

### Database

**New table: `friendships`**
```text
id          | uuid        | PK, gen_random_uuid()
requester_id| uuid        | NOT NULL (the user who sent the request)
addressee_id| uuid        | NOT NULL (the user who receives the request)
status      | text        | NOT NULL, default 'pending' (pending / accepted / rejected)
created_at  | timestamptz | NOT NULL, default now()
updated_at  | timestamptz | NOT NULL, default now()
UNIQUE(requester_id, addressee_id)
```

**RLS Policies:**
- SELECT: participant can view (`auth.uid() = requester_id OR auth.uid() = addressee_id`)
- INSERT: requester must be self (`auth.uid() = requester_id`)
- UPDATE: only addressee can accept/reject (`auth.uid() = addressee_id`)
- DELETE: either participant can unfriend (`auth.uid() = requester_id OR auth.uid() = addressee_id`)

### UI

**New page: `src/pages/Friends.tsx`**
- Three tabs: "All Friends", "Pending", "Add Friend"
- **All Friends tab**: list of accepted friends with online status, click to open DM
- **Pending tab**: incoming requests with Accept/Reject buttons; outgoing requests with Cancel
- **Add Friend tab**: search by username/display name, send friend request button

**Navigation update (`AppLayout.tsx`)**:
- Add a "Friends" nav item (Users icon) between Messages and Settings

**New route in `App.tsx`**:
- `/friends` route inside the protected layout

### i18n additions (both en.ts and ar.ts)
- `friends.title`, `friends.all`, `friends.pending`, `friends.add`, `friends.search`, `friends.sendRequest`, `friends.accept`, `friends.reject`, `friends.cancel`, `friends.remove`, `friends.noFriends`, `friends.noPending`, `friends.requestSent`, `friends.requestAccepted`

---

## Feature 2: Group Chats

### Database

**Modify `dm_threads` -> generalize to support groups**

Rather than modifying dm_threads (which would break existing logic), create new tables:

**New table: `group_threads`**
```text
id          | uuid        | PK, gen_random_uuid()
name        | text        | NOT NULL
avatar_url  | text        | nullable
created_by  | uuid        | NOT NULL (admin/creator)
last_message_at | timestamptz | default now()
created_at  | timestamptz | NOT NULL, default now()
```

**New table: `group_members`**
```text
id          | uuid        | PK, gen_random_uuid()
group_id    | uuid        | NOT NULL, FK -> group_threads(id) ON DELETE CASCADE
user_id     | uuid        | NOT NULL
role        | text        | NOT NULL, default 'member' (admin / member)
joined_at   | timestamptz | NOT NULL, default now()
UNIQUE(group_id, user_id)
```

**Extend `messages` table:**
- Add column `group_thread_id` (uuid, nullable, FK -> group_threads(id))
- Make `thread_id` nullable (messages belong to either a DM thread OR a group thread)

**RLS for group_threads:**
- SELECT: user is a member (`EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid())`)
- INSERT: authenticated users can create (`auth.uid() = created_by`)
- UPDATE: only admin can update (`EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid() AND role = 'admin')`)

**RLS for group_members:**
- SELECT: user is a member of the group
- INSERT: only admin can add members
- DELETE: admin can remove members, or user can leave (self)
- UPDATE: only admin can change roles

**Updated RLS for messages** (to also allow group thread participants):
- SELECT: user is DM participant OR group member
- INSERT: user is DM participant OR group member, and `auth.uid() = author_id`

**Enable realtime** on `group_threads` and `group_members`.

### UI

**New page: `src/pages/GroupChat.tsx`**
- Similar to Chat.tsx but adapted for groups:
  - Header shows group name + member count
  - Messages show author name/avatar (since multiple participants)
  - Composer same as DM
  - Group settings button (for admin): rename group, add/remove members

**New dialog: `src/components/CreateGroupDialog.tsx`**
- Modal to create a group: name input + select friends to add
- Creator becomes admin automatically

**New dialog: `src/components/GroupSettingsDialog.tsx`**
- Admin can: rename group, add members, remove members, see member list with roles

**Update `src/pages/Inbox.tsx`**:
- Show both DM threads and group threads in one list, sorted by `last_message_at`
- Group threads show group name, group avatar (or member initials), member count, last message

**New route in `App.tsx`**:
- `/group/:groupId` route inside the protected layout

**Update `src/hooks/useUnreadCount.ts`**:
- Also count unread from group threads

### i18n additions (both en.ts and ar.ts)
- `groups.create`, `groups.name`, `groups.namePlaceholder`, `groups.addMembers`, `groups.settings`, `groups.members`, `groups.admin`, `groups.member`, `groups.leave`, `groups.removeMember`, `groups.rename`, `groups.noGroups`, `groups.created`
- `nav.friends`

---

## Technical Details

### Files Created
- `src/pages/Friends.tsx` -- Friends page with tabs
- `src/pages/GroupChat.tsx` -- Group chat page
- `src/components/CreateGroupDialog.tsx` -- Create group modal
- `src/components/GroupSettingsDialog.tsx` -- Group admin settings

### Files Modified
- **Database migration** -- create `friendships`, `group_threads`, `group_members` tables; add `group_thread_id` to messages; update messages RLS; enable realtime
- `src/App.tsx` -- add `/friends` and `/group/:groupId` routes
- `src/components/layout/AppLayout.tsx` -- add Friends nav item
- `src/pages/Inbox.tsx` -- merge group threads into inbox list; add "Create Group" button
- `src/hooks/useUnreadCount.ts` -- include group thread unreads
- `src/i18n/en.ts` -- add friends + groups translations
- `src/i18n/ar.ts` -- add friends + groups translations

### Architecture Notes
- DM threads and group threads use separate tables to avoid breaking existing DM logic
- Messages table is extended with a nullable `group_thread_id` -- a message belongs to either `thread_id` (DM) or `group_thread_id` (group), not both
- Group admin role is stored in `group_members.role`, not in profiles (following security best practices)
- The creator of a group is automatically the admin; admin can promote other members

