

## GDPR Account Deletion & Data Export

### Current State
- "Delete Account" shows a toast saying "contact support" -- does nothing
- "Request My Data" shows a toast saying "email shortly" -- does nothing

### Plan

#### 1. Edge Function: `delete-account` 
A SECURITY DEFINER edge function that:
- Authenticates the caller via JWT
- Deletes all user data from every table in order (respecting FK constraints):
  - `voice_channel_participants`, `message_reactions`, `message_hidden`, `messages` (by author_id)
  - `channel_read_status`, `thread_read_status`, `channel_members`
  - `server_audit_logs`, `member_roles`, `server_members`
  - `dm_thread_visibility`, `pinned_chats`, `profile_notes` (both author and target)
  - `notifications`, `blocked_users` (both directions)
  - `friendships` (both directions), `group_members`
  - `user_equipped`, `user_purchases`, `custom_stickers`
  - `call_sessions` (both directions), `message_reports`
  - `profiles`
- Uses the service role key to delete across RLS boundaries
- Finally calls `auth.admin.deleteUser(userId)` to remove the auth record
- Returns success/error

Config: Add `[functions.delete-account]` with `verify_jwt = false` (we validate manually)

#### 2. Edge Function: `export-user-data`
A SECURITY DEFINER edge function that:
- Authenticates the caller via JWT
- Queries all tables for user data (profile, messages, friendships, servers, DMs, groups, purchases, reactions, notifications, blocked users, reports, stickers, call history)
- Builds a structured JSON response (JSON is the most portable GDPR-compliant format, and can be large without breaking)
- Client downloads it as a `.json` file

Config: Add `[functions.export-user-data]` with `verify_jwt = false`

#### 3. Update `AccountTab.tsx`
- **Delete Account**: Add password confirmation input in the dialog. Call `delete-account` edge function, show loading state, then sign out and redirect to `/auth`
- **Request My Data**: Call `export-user-data` edge function, show "Your data is being prepared..." toast, then trigger browser download of the JSON file when ready

#### 4. Update `supabase/config.toml`
Add the two new function entries.

### Files Changed
| File | Action |
|------|--------|
| `supabase/functions/delete-account/index.ts` | Create |
| `supabase/functions/export-user-data/index.ts` | Create |
| `supabase/config.toml` | Edit -- add function entries |
| `src/components/settings/tabs/AccountTab.tsx` | Edit -- wire up real flows |

