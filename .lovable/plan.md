

## Investigation Results

### Root Cause: Multiple Issues

**Issue 1: `ALL_FALSE` defaults grant permissions that should be denied**

In `src/hooks/useServerPermissions.ts` (lines 36–43), the `ALL_FALSE` object — used as the **default** and **fallback** for regular members — has these permissions set to `true`:

```ts
send_messages: true, attach_files: true, create_polls: true,
connect: true, speak: true, video: true, create_invites: true
```

This means that when a regular member has **no roles assigned**, or when the `get_user_permissions` RPC returns no data, they default to having `send_messages`, `connect`, `speak`, etc. all set to `true`. This completely bypasses the channel-level restriction system, because the check at line 434 is:

```ts
const canSendMessages = restrictedPermissions?.includes("send_messages")
  ? permissions.send_messages   // ← this is TRUE from ALL_FALSE defaults
  : true;
```

**Fix:** Change `ALL_FALSE` so every permission is actually `false`. Members without any role should have no special permissions — the RPC should be the source of truth.

**Issue 2: Voice channel join has zero permission checks**

In `src/pages/ServerView.tsx` (line 184), `joinVoiceChannel` directly calls `setVoiceCtx` with no permission check whatsoever. It doesn't read the channel's `restricted_permissions`, doesn't check `connect`, `speak`, or `video` permissions. Any member can join any voice channel regardless of restrictions.

**Fix:** Before joining a voice channel, fetch the channel's `restricted_permissions`. If `connect` is restricted, check the user's permissions via `useServerPermissions`. Block the join and show a toast if denied.

**Issue 3: `send-message` edge function also has a fallback gap**

The `send-message` edge function (line 120) correctly checks `restrictedPerms.includes(perm)` before calling the `has_role_permission` RPC. However, if the RPC returns `null`/`false` for a user without a matching role, the function correctly blocks. This part seems sound — the backend enforcement is correct for text channels. The problem is purely on the **client side** where the UI doesn't prevent sending (the input is shown as enabled due to Issue 1).

### Plan

1. **Fix `ALL_FALSE` in `useServerPermissions.ts`** — Set every single permission to `false`. No permission should default to `true` for members without roles.

2. **Add voice channel permission check in `ServerView.tsx`** — In `handleVoiceChannelSelect` / `joinVoiceChannel`, fetch the channel's `restricted_permissions` from the database. If `connect` is in the restricted list, check `permissions.connect` from `useServerPermissions`. If denied, show a toast and block the join.

3. **Pass `restricted_permissions` through the voice channel flow** — The `ChannelSidebar` already has channel data including `restricted_permissions`. Pass it through `onVoiceChannelSelect` so the permission check can happen without an extra DB query.

### Files to modify:
- `src/hooks/useServerPermissions.ts` — Fix `ALL_FALSE` defaults
- `src/pages/ServerView.tsx` — Add voice permission check
- `src/components/server/ChannelSidebar.tsx` — Pass `restricted_permissions` in voice channel select callback

