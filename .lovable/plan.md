

## Analysis: Audit Logs Failing to Load

### Root Cause
The `server_audit_logs` table does **not exist** in the database. It's absent from the schema provided by the system, meaning the migration `20260226000002_server_audit_logs.sql` likely failed because it contains a **foreign key reference to `auth.users(id)`** — which is a reserved Supabase schema that causes migration failures.

The query in `AuditLogView.tsx` hits a non-existent table, returns an error, and triggers the "Failed to load audit logs" toast.

### Fix

#### 1. New database migration
Create the `server_audit_logs` table **without** the `auth.users` foreign key (per project conventions, reference user IDs without FK constraints to auth schema):

```sql
CREATE TABLE IF NOT EXISTS public.server_audit_logs (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  server_id   uuid        NOT NULL,
  actor_id    uuid        NOT NULL,
  action_type text        NOT NULL,
  target_id   uuid,
  changes     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.server_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs"
ON public.server_audit_logs FOR SELECT
USING (public.is_server_admin(auth.uid(), server_id));

CREATE POLICY "Admins can insert audit logs"
ON public.server_audit_logs FOR INSERT
WITH CHECK (
  auth.uid() = actor_id
  AND public.is_server_admin(auth.uid(), server_id)
);
```

#### 2. Fix MarkdownToolbar.tsx build error (unrelated but blocking)
Line 109-110: TypeScript narrowing issue with the `TOOLBAR_BUTTONS` array — after the divider guard clause returns, TS doesn't narrow the type. Add a type assertion or explicit check for `title` and `action`.

### Files

| File | Change |
|------|--------|
| New migration | Create `server_audit_logs` table without `auth.users` FK |
| `src/components/chat/MarkdownToolbar.tsx` | Fix TS2339 build error on toolbar button type narrowing |

