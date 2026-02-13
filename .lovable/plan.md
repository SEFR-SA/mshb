

# Group Chat 3-Panel Layout + Login with Username + Unique Username Validation

## Overview
Three changes: (1) Add the same 3-panel Discord layout to the Group Chat page, showing group members in the right panel, (2) Allow login with either email or username, (3) Enforce unique usernames with real-time feedback during signup.

---

## 1. Group Chat 3-Panel Layout

### `src/pages/GroupChat.tsx` -- Major restructure
- Import `ChatSidebar` and `useIsMobile` (same as `Chat.tsx` uses)
- Create a new `GroupMembersPanel` component for the right panel
- On desktop: wrap in a 3-column flex layout with `ChatSidebar` (left), chat area (center), and `GroupMembersPanel` (right)
- On mobile: keep current single-column view with back button
- Remove the back button on desktop (sidebar handles navigation)

### New component: `src/components/chat/GroupMembersPanel.tsx`
- Props: `profiles: Map<string, Profile>`, `memberRoles: Map<string, string>`, `groupName: string`, `memberCount: number`
- Layout (matching the UserProfilePanel style):
  - Banner area (group avatar or gradient placeholder)
  - Group name (large, bold)
  - Member count
  - Separator
  - **Members list**: Each member shown with avatar, display name, username, online status badge, and role tag (Admin/Member)
  - Admins listed first, then members alphabetically
- Styled with the same glass/galaxy theme as `UserProfilePanel`

---

## 2. Login with Email or Username

### `src/pages/Auth.tsx`
- In login mode, change the "Email" field to "Email or Username"
- Add state `loginIdentifier` to hold the input value
- On login submit:
  - If the identifier contains `@`, treat it as an email and call `signIn(identifier, password)` directly
  - If it does not contain `@`, look up the email from the `profiles` table by username first:
    - Query: `supabase.from("profiles").select("user_id").eq("username", identifier).maybeSingle()`
    - Then query auth -- but since we can't get email from profiles, we need to store email or use a different approach
  - **Better approach**: Add a helper in `AuthContext` that looks up the user's email from profiles. We'll need to store the user's email in the profiles table, OR use a database function.
  - **Simplest secure approach**: Create a database function `get_email_by_username(username text)` that returns the email from `auth.users` joined with profiles. This is a `SECURITY DEFINER` function so it can access `auth.users`.

### Database migration
- Create function `get_email_by_username`:
```sql
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.email
  FROM auth.users au
  JOIN public.profiles p ON p.user_id = au.id
  WHERE lower(p.username) = lower(p_username)
  LIMIT 1;
$$;
```

### `src/contexts/AuthContext.tsx`
- Update `signIn` to accept an identifier (email or username)
- If identifier lacks `@`, call `supabase.rpc('get_email_by_username', { p_username: identifier })` to resolve the email, then sign in with that email
- If no email found, return an error

### i18n
- `auth.emailOrUsername`: "Email or Username" / "البريد الإلكتروني أو اسم المستخدم"
- `auth.userNotFound`: "No account found with that username" / "لا يوجد حساب بهذا الاسم"

---

## 3. Unique Username Validation

### Database migration
- Add a UNIQUE constraint on `profiles.username`:
```sql
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);
```

### `src/pages/Auth.tsx`
- Add a debounced check (300ms) when the username field changes during signup
- Query: `supabase.from("profiles").select("id").eq("username", username).maybeSingle()`
- If a result is found, show a red message below the field: "Username is already taken"
- If not found, show a green checkmark: "Username is available"
- Block form submission if the username is taken

### i18n
- `auth.usernameTaken`: "Username is already taken" / "اسم المستخدم مستخدم بالفعل"
- `auth.usernameAvailable`: "Username is available" / "اسم المستخدم متاح"

---

## Technical Details

### Files Created
- `src/components/chat/GroupMembersPanel.tsx` -- right panel for group chat showing member list

### Files Modified
- `src/pages/GroupChat.tsx` -- wrap in 3-panel layout (desktop) using ChatSidebar + GroupMembersPanel
- `src/pages/Auth.tsx` -- login with email/username, debounced username uniqueness check on signup
- `src/contexts/AuthContext.tsx` -- signIn resolves username to email via RPC
- `src/i18n/en.ts` -- new keys for email/username login, username taken/available, group members
- `src/i18n/ar.ts` -- Arabic translations

### Database Migration
- Add UNIQUE constraint on `profiles.username`
- Create `get_email_by_username` security definer function

