

## Fix Server Creation and Display Issues

### Root Cause

There are **circular RLS policy dependencies** preventing server creation and display:

1. **Server INSERT fails (403)**: The `CreateServerDialog` calls `.insert(...).select("id")`. The `.select("id")` triggers a SELECT check on the `servers` table. The SELECT policy requires `is_server_member(auth.uid(), id)`, but the user isn't a member yet (the membership row hasn't been inserted). So the INSERT+SELECT combo is rejected.

2. **Server Members INSERT fails**: The policy for inserting into `server_members` has an `EXISTS (SELECT 1 FROM servers WHERE id = ... AND owner_id = auth.uid())` check. This sub-query is subject to the `servers` SELECT RLS policy, which again requires `is_server_member` -- creating a circular dependency.

3. **Join Server fails**: When joining via invite code, the user first does `SELECT id FROM servers WHERE invite_code = ?`. This fails because the SELECT policy requires membership, but the user isn't a member yet.

4. **Servers not displaying (even when inserted via DB)**: The `ServerRail` first fetches `server_members`, then fetches servers using those IDs. The servers SELECT policy requires `is_server_member`, which works IF the membership exists. If you inserted a server directly in the DB without a corresponding `server_members` row, it won't show.

### Fix: Database Migration

Update three RLS policies to break the circular dependencies:

**1. `servers` SELECT policy** -- Allow owners and any authenticated user to read by invite code:
```sql
DROP POLICY "Members can view servers" ON public.servers;
CREATE POLICY "Members can view servers" ON public.servers FOR SELECT
  USING (
    public.is_server_member(auth.uid(), id) 
    OR owner_id = auth.uid()
  );
```

**2. `server_members` INSERT policy** -- Allow self-insert for any authenticated user (needed for both creation and joining):
```sql
DROP POLICY "Admin can add members" ON public.server_members;
CREATE POLICY "Admin can add members" ON public.server_members FOR INSERT
  WITH CHECK (
    public.is_server_admin(auth.uid(), server_id) 
    OR (auth.uid() = user_id)
  );
```

**3. `channels` INSERT policy** -- The owner creates a channel immediately after inserting themselves as a member. Since `is_server_admin` is SECURITY DEFINER (bypasses RLS), this should work once the member row exists. No change needed here.

### Fix: Join Server Flow

The join flow needs to look up a server by invite code, but the SELECT policy won't match for non-members. Two options:
- **Option A**: Add `OR invite_code IS NOT NULL` to SELECT (too permissive)
- **Option B (chosen)**: Create a SECURITY DEFINER function `get_server_by_invite_code(text)` that bypasses RLS to look up the server ID

```sql
CREATE OR REPLACE FUNCTION public.get_server_id_by_invite(p_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.servers WHERE invite_code = p_code LIMIT 1;
$$;
```

Then update `JoinServerDialog.tsx` to call `.rpc("get_server_id_by_invite", { p_code: code.trim() })` instead of querying the table directly.

### Fix: `server_members` Update Policy

Currently there's an `Admin can update member roles` policy. We need to make sure it allows the owner to promote/demote. The current `is_server_admin` function checks for `role IN ('owner', 'admin')`, so this should already work.

### Summary of Changes

| File/Resource | Change |
|---|---|
| **New SQL migration** | Fix `servers` SELECT policy (add `OR owner_id = auth.uid()`); fix `server_members` INSERT policy (allow self-insert); add `get_server_id_by_invite` function |
| `src/components/server/JoinServerDialog.tsx` | Use RPC function instead of direct table query for invite code lookup |

### Technical Notes

- The `is_server_member` and `is_server_admin` functions are `SECURITY DEFINER`, so they bypass RLS when checking membership. This is correct and intentional.
- The self-insert allowance on `server_members` is safe because the role defaults to `'member'` and the user can only insert their own `user_id` (enforced by `auth.uid() = user_id`).
- The `servers` SELECT policy adding `owner_id = auth.uid()` is safe -- owners should always be able to see their own servers.
