

## Fix: Announcement Channel Creation + Audit Log Entries

### Issue 1: Announcement channel creation fails silently

The `handleCreateChannel` function inserts `is_announcement: true` into the `channels` table, but this column does not exist in the schema. The insert fails, `newChannel` is null, and nothing happens.

**Fix**: Add an `is_announcement` boolean column to the `channels` table via migration (default `false`).

| File | Change |
|------|--------|
| New migration | `ALTER TABLE public.channels ADD COLUMN is_announcement boolean NOT NULL DEFAULT false;` |

### Issue 2: Promote/demote actions don't write audit logs

The `promoteToAdmin` and `demoteToMember` functions in `ServerSettingsDialog.tsx` update the role but never insert into `server_audit_logs`.

**Fix**: Add audit log inserts after role changes.

| File | Change |
|------|--------|
| `src/components/server/ServerSettingsDialog.tsx` | Add `server_audit_logs` insert in `promoteToAdmin` and `demoteToMember` functions |

