

## Plan: Server Invite via DM with Join/Decline Buttons

### Current Behavior
When clicking "Send Link" in the invite modal, a plain text message is sent: `Join my server **serverName**! https://mshb.lovable.app/invite/CODE`. The recipient must click the link, get redirected, and then click "Accept Invite" on a separate page.

### Proposed Changes

The approach: send a special message with `type: 'server_invite'` containing structured metadata (server ID, invite code, server name). In the Chat page, detect this message type and render it as a styled invite card with "Join Server" and "Decline" buttons — all inline, no page navigation needed.

#### 1. Database: Add metadata column to messages table
- Add a `metadata` column (`jsonb`, nullable, default `null`) to the `messages` table to store structured invite data like `{ server_id, invite_code, server_name, server_icon_url }`.

#### 2. `src/components/server/InviteModal.tsx`
- Rename button text from `sendLink` → `sendInvite` in the translation keys.
- Change the `sendLink` function to insert a message with:
  - `type: 'server_invite'`
  - `content: ''` (or a fallback text)
  - `metadata: { server_id, invite_code, server_name, server_icon_url }`

#### 3. `src/i18n/en.ts` and `src/i18n/ar.ts`
- Change `sendLink` to `sendInvite` with values "Send Invite" / "إرسال دعوة"
- Add keys: `servers.joinServer`, `servers.declineInvitation`, `servers.inviteDeclined`, `servers.alreadyMember`

#### 4. New component: `src/components/chat/ServerInviteCard.tsx`
- A card component rendered inside chat bubbles for messages where `type === 'server_invite'`.
- Displays: server icon/name, "Join Server" button, "Decline Invitation" button.
- **Join Server**: calls `use_invite` RPC, inserts into `server_members`, navigates to the server. Shows toast on success.
- **Decline Invitation**: dismisses the card visually (could mark as declined in local state or just hide buttons).
- Handles edge cases: already a member (navigates directly), expired invite (shows error).

#### 5. `src/pages/Chat.tsx`
- In the message rendering loop (around line 475-644), add a check: if `(msg as any).type === 'server_invite'` and not deleted, render `<ServerInviteCard>` instead of the normal message content.
- The card replaces the text content area but keeps the same bubble styling and context menu.

### Technical Details

**Message metadata structure:**
```json
{
  "server_id": "uuid",
  "invite_code": "ABC123",
  "server_name": "My Server",
  "server_icon_url": "https://..."
}
```

**ServerInviteCard join flow:**
```typescript
// 1. Call use_invite RPC to validate + increment use count
const { data: serverId } = await supabase.rpc("use_invite", { p_code: metadata.invite_code });
// 2. Insert as server member
await supabase.from("server_members").insert({ server_id: serverId, user_id, role: "member" });
// 3. Navigate to server
navigate(`/server/${serverId}`);
```

### Files Summary

| File | Change |
|------|--------|
| Migration | Add `metadata jsonb` column to `messages` |
| `src/components/server/InviteModal.tsx` | Send structured invite message with type + metadata |
| `src/components/chat/ServerInviteCard.tsx` | New: invite card with Join/Decline buttons |
| `src/pages/Chat.tsx` | Render ServerInviteCard for invite-type messages |
| `src/i18n/en.ts` | Add/update translation keys |
| `src/i18n/ar.ts` | Add/update Arabic translation keys |

