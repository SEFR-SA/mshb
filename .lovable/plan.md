

# Fix Group Creation RLS Policy

## Problem
Creating a new group fails with a 403 error because the RLS INSERT policy on `group_threads` is RESTRICTIVE. PostgreSQL requires at least one PERMISSIVE policy to grant access -- restrictive policies alone will always deny.

The same issue likely affects the `group_members` table INSERT policy, which would fail on the next step after group creation.

## Fix

### Database Migration
Drop the restrictive INSERT policies on `group_threads` and `group_members`, then recreate them as PERMISSIVE:

```sql
-- Fix group_threads INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.group_threads;
CREATE POLICY "Authenticated users can create groups"
  ON public.group_threads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Fix group_members INSERT policy
DROP POLICY IF EXISTS "Admin can add members" ON public.group_members;
CREATE POLICY "Admin can add members"
  ON public.group_members FOR INSERT
  TO authenticated
  WITH CHECK (
    is_group_admin(auth.uid(), group_id)
    OR (
      auth.uid() = user_id
      AND EXISTS (
        SELECT 1 FROM group_threads
        WHERE group_threads.id = group_members.group_id
          AND group_threads.created_by = auth.uid()
      )
    )
  );
```

Also fix the SELECT/UPDATE/DELETE policies on both tables, since they are all restrictive and will block access:

```sql
-- group_threads SELECT
DROP POLICY IF EXISTS "Members can view group threads" ON public.group_threads;
CREATE POLICY "Members can view group threads"
  ON public.group_threads FOR SELECT
  TO authenticated
  USING (is_group_member(auth.uid(), id));

-- group_threads UPDATE
DROP POLICY IF EXISTS "Admin can update group" ON public.group_threads;
CREATE POLICY "Admin can update group"
  ON public.group_threads FOR UPDATE
  TO authenticated
  USING (is_group_admin(auth.uid(), id));

-- group_members SELECT
DROP POLICY IF EXISTS "Members can view group members" ON public.group_members;
CREATE POLICY "Members can view group members"
  ON public.group_members FOR SELECT
  TO authenticated
  USING (is_group_member(auth.uid(), group_id));

-- group_members UPDATE
DROP POLICY IF EXISTS "Admin can update roles" ON public.group_members;
CREATE POLICY "Admin can update roles"
  ON public.group_members FOR UPDATE
  TO authenticated
  USING (is_group_admin(auth.uid(), group_id));

-- group_members DELETE
DROP POLICY IF EXISTS "Admin can remove or self leave" ON public.group_members;
CREATE POLICY "Admin can remove or self leave"
  ON public.group_members FOR DELETE
  TO authenticated
  USING (is_group_admin(auth.uid(), group_id) OR auth.uid() = user_id);
```

## Technical Details

### Root Cause
All RLS policies on `group_threads` and `group_members` were created as RESTRICTIVE (using `CREATE POLICY ... AS RESTRICTIVE` or equivalent). PostgreSQL's RLS model requires at least one PERMISSIVE policy per operation for access to be granted. Restrictive policies can only further narrow access granted by permissive ones.

### Files Modified
- **Database migration only** -- no code changes needed. The `CreateGroupDialog.tsx` code is correct; it's purely a database policy issue.

