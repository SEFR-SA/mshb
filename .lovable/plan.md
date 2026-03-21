

## Investigation

The database has **two overloads** of `has_role_permission`:

1. `has_role_permission(_user_id uuid, _server_id uuid, _permission text)` — 3 params
2. `has_role_permission(_user_id uuid, _server_id uuid, _permission text, _skip_defaults boolean DEFAULT false)` — 4 params with a default

When any caller passes 3 arguments, PostgreSQL cannot disambiguate between the two signatures and throws `"function has_role_permission(uuid, uuid, unknown) is not unique"`.

The `server_moderate_voice_user` function calls `has_role_permission(auth.uid(), v_server_id, 'mute_members')` with 3 args, triggering the error.

## Fix

**Database migration** — Drop the redundant 3-parameter overload. The 4-parameter version with `_skip_defaults boolean DEFAULT false` already handles all 3-argument calls identically.

```sql
DROP FUNCTION IF EXISTS public.has_role_permission(uuid, uuid, text);
```

This single statement resolves the ambiguity. All existing callers (edge functions, other DB functions, RPCs) that pass 3 arguments will now correctly match the 4-parameter version via its default. Callers that pass 4 arguments continue to work unchanged.

No code changes needed. The owner bypass (`IF _base_role IN ('owner', 'admin') THEN RETURN true`) is already in the remaining function, so owners have full permissions on everything.

