-- ─── Restore server owner's ability to self-insert as 'owner' ───────────────
-- Migration 20260308123537 tightened self-join security (role='member' only)
-- but inadvertently removed the owner clause, silently blocking server creation.
-- This restores the clause from the original 20260214130442 migration.

DROP POLICY IF EXISTS "Admin can add members" ON public.server_members;

CREATE POLICY "Admin can add members" ON public.server_members
  FOR INSERT WITH CHECK (
    -- Existing admins/owners can add other users with any role
    is_server_admin(auth.uid(), server_id)
    -- Regular users joining via invite must use role='member'
    OR (auth.uid() = user_id AND role = 'member')
    -- Server creator can insert themselves as 'owner', verified against servers.owner_id
    OR (
      auth.uid() = user_id
      AND role = 'owner'
      AND EXISTS (
        SELECT 1 FROM public.servers
        WHERE id = server_id AND owner_id = auth.uid()
      )
    )
  );
