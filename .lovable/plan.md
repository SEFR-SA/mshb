

## Add Comprehensive Right-Click Context Menus

This plan adds right-click context menus to 6 key areas across the app, following the same pattern already used for servers in the Server Rail.

### Areas to Add Context Menus

#### 1. Messages (DM, Group Chat, Server Channel)
Right-clicking a message bubble will show:
- **Copy Text** -- copies message content to clipboard
- **Reply** -- quotes the message (prepends "> original text" to input)
- **Edit** -- (own messages only) enters edit mode
- **Delete for Me** -- hides message locally
- **Delete for Everyone** -- (own messages only) deletes for all
- **Mark as Unread** -- resets read status to before this message

Files: `src/pages/Chat.tsx`, `src/pages/GroupChat.tsx`, `src/components/server/ServerChannelChat.tsx`

#### 2. Usernames in Server Chat
Right-clicking a username in server channel messages will show:
- **Message** -- opens/creates a DM thread with this user
- **Add Friend** -- sends a friend request (hidden if already friends)
- **Remove Friend** -- removes friendship (shown if already friends)
- **Call** -- initiates a voice call via DM
- **Invite to Server** -- sub-menu listing user's servers to invite to (future consideration, placeholder)
- **Copy Username** -- copies @username to clipboard

Files: `src/components/server/ServerChannelChat.tsx`

#### 3. Usernames in Group Chat
Same menu as server chat usernames for the author name display.

Files: `src/pages/GroupChat.tsx`

#### 4. Friends List Items
Right-clicking a friend row will show:
- **Message** -- opens DM
- **Call** -- initiates voice call
- **Copy Username** -- copies @username
- **Remove Friend** -- removes from friends list

Files: `src/pages/Friends.tsx`

#### 5. Server Member List Items
Right-clicking a member in the server member panel will show:
- **Message** -- opens/creates DM
- **Add Friend** / **Remove Friend** -- based on friendship status
- **Call** -- initiates voice call
- **Copy Username** -- copies @username

Files: `src/components/server/ServerMemberList.tsx`

#### 6. Chat Sidebar / Inbox Thread Items
Right-clicking a conversation in the sidebar or Inbox will show:
- **Pin** / **Unpin** -- toggles pin status
- **Mark as Read** -- marks all messages as read
- **Mute Notifications** -- (placeholder for future)
- **Delete Conversation** -- removes DM thread

Files: `src/components/chat/ChatSidebar.tsx`, `src/pages/Inbox.tsx`

---

### Implementation Approach

**Reusable Components**: Create two shared context menu components to avoid code duplication:

1. **`src/components/chat/UserContextMenu.tsx`** -- Wraps any username/avatar element. Accepts `targetUserId`, `targetUsername`, and callbacks. Handles friend status lookup internally. Used across server chat, group chat, friends page, and member list.

2. **`src/components/chat/MessageContextMenu.tsx`** -- Wraps a message bubble. Accepts the message data, `isMine` flag, and action callbacks (copy, reply, edit, delete, mark unread). Used across DM, group, and server channel chat.

**No database changes required** -- all actions use existing tables and RPC functions.

### Technical Details

| Component | What it wraps | Context menu items |
|---|---|---|
| `UserContextMenu` | Username spans, avatar buttons, friend rows, member rows | Message, Add/Remove Friend, Call, Copy Username |
| `MessageContextMenu` | Message bubble divs | Copy Text, Reply, Edit, Delete for Me, Delete for Everyone, Mark as Unread |

**Files to create:**
- `src/components/chat/UserContextMenu.tsx`
- `src/components/chat/MessageContextMenu.tsx`

**Files to modify:**
- `src/pages/Chat.tsx` -- wrap message bubbles with MessageContextMenu
- `src/pages/GroupChat.tsx` -- wrap message bubbles + author names
- `src/components/server/ServerChannelChat.tsx` -- wrap message rows + author names
- `src/pages/Friends.tsx` -- wrap friend rows
- `src/components/server/ServerMemberList.tsx` -- wrap member buttons
- `src/components/chat/ChatSidebar.tsx` -- wrap thread items with Pin/Mark Read/Delete
- `src/pages/Inbox.tsx` -- wrap inbox items with Pin/Mark Read/Delete

**Friend status check**: `UserContextMenu` will query the `friendships` table on mount to determine whether to show "Add Friend" or "Remove Friend". This is a lightweight single-row query.

**Mark as Unread**: Will update `thread_read_status` or `channel_read_status` to set `last_read_at` to just before the right-clicked message's timestamp, causing the unread badge to reappear.

**Reply**: Will prepend `> quoted text\n` to the message input (simple quote-style reply, matching the existing input pattern without requiring a new database column).

