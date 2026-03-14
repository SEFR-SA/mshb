

# Username Uniqueness, Cooldown, and Password Confirmation

## Overview

Enforce username rules: unique (already exists via DB constraint), minimum 3 characters, changeable only once every 6 months with password confirmation.

## Database Changes

**Migration: Add `username_changed_at` column to `profiles`**

```sql
ALTER TABLE public.profiles
ADD COLUMN username_changed_at timestamptz DEFAULT NULL;
```

For existing users, this defaults to `NULL` (meaning they can change immediately). Once changed, the timestamp is set, enforcing the 6-month cooldown.

**Migration: Add CHECK constraint for minimum 3 characters**

```sql
ALTER TABLE public.profiles
ADD CONSTRAINT username_min_length CHECK (username IS NULL OR length(username) >= 3);
```

**Migration: Create a security-definer function to change username with password verification**

```sql
CREATE OR REPLACE FUNCTION public.change_username(p_new_username text, p_password text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_last_changed timestamptz;
  v_created_at timestamptz;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Validate length
  IF length(trim(p_new_username)) < 3 THEN
    RETURN jsonb_build_object('error', 'too_short');
  END IF;

  -- Check 6-month cooldown
  SELECT username_changed_at, created_at INTO v_last_changed, v_created_at
  FROM profiles WHERE user_id = v_user_id;

  IF v_last_changed IS NOT NULL AND v_last_changed > now() - interval '6 months' THEN
    RETURN jsonb_build_object('error', 'cooldown', 'next_change_at', (v_last_changed + interval '6 months')::text);
  END IF;

  -- Verify password via auth.uid() email
  SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;

  -- Attempt sign-in to verify password (done via extension or pg_net — 
  -- but since we can't call auth from PL/pgSQL easily, 
  -- we'll verify password on the client side and use this RPC for the update)
  
  -- Check uniqueness
  IF EXISTS (SELECT 1 FROM profiles WHERE lower(username) = lower(trim(p_new_username)) AND user_id <> v_user_id) THEN
    RETURN jsonb_build_object('error', 'taken');
  END IF;

  -- Update
  UPDATE profiles
  SET username = lower(trim(p_new_username)),
      username_changed_at = now()
  WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
```

**Note on password verification**: Since Supabase's `auth.users` table doesn't expose password hashing to PL/pgSQL, password verification will happen client-side via `supabase.auth.signInWithPassword()` before calling the RPC — same pattern already used for account deletion.

## Frontend Changes

### 1. `src/components/settings/tabs/AccountTab.tsx` — Username edit section

Replace the simple `saveUsername` function with:
- Add a `usernamePassword` state field
- Add a password input field in the username edit form
- Before saving, call `supabase.auth.signInWithPassword()` to verify the password
- Then call the `change_username` RPC instead of a direct profile update
- Show the cooldown date if the user can't change yet (fetch `username_changed_at` from profile)
- Enforce 3-character minimum with validation message
- Show remaining cooldown time if within 6 months

### 2. `src/components/settings/tabs/ProfileTab.tsx` — Remove username from bulk save

The ProfileTab currently saves username alongside other profile fields. Username changes must now go through the password-verified flow in AccountTab only. Remove `username` from the ProfileTab save payload and make the username field read-only (or remove it entirely, showing it as display-only).

### 3. `src/pages/Settings.tsx` — Same treatment

The Settings page also saves username in a bulk update. Remove username from that save logic too.

### 4. `src/pages/Auth.tsx` — Already enforces 3-char minimum

The signup flow already validates `username.trim().length >= 3` and shows `too_short` status. No changes needed here. The DB CHECK constraint adds server-side enforcement.

## Summary

| Change | Location | Purpose |
|---|---|---|
| Add `username_changed_at` column | DB migration | Track last change timestamp |
| Add `username_min_length` CHECK | DB migration | Server-side 3-char enforcement |
| Create `change_username` RPC | DB migration | Atomic username change with cooldown check |
| Password + cooldown UI | AccountTab.tsx | User must enter password, see cooldown |
| Remove username from bulk save | ProfileTab.tsx, Settings.tsx | Force all changes through secured flow |

