

## Investigation Results

### Root Cause

The bug is in `usePresence.ts` `getUserStatus()` (line 63-68):

```ts
const getUserStatus = (profile: any): string => {
  if (!profile) return "offline";
  if (profile.status === "invisible") return "invisible";
  if (isOnline(profile.user_id)) return profile.status || "online";
  return "offline";
};
```

The problem is a **race condition** between Presence channel sync and profile data:

1. When the popover opens, `UserPanelPopover` calls `usePresence()` which returns `getUserStatus`.
2. `getUserStatus` checks `isOnline(profile.user_id)` -- this depends on the Presence channel's `presenceMap` state.
3. When the popover first mounts, the presence channel may not have synced yet, so `isOnline()` returns `false`, causing `getUserStatus` to return `"offline"` instead of the user's actual status.
4. A moment later, presence syncs and the status corrects itself -- explaining the brief flash of wrong status.

Additionally, `profile.status || "online"` means if `profile.status` is somehow falsy (empty string, null), it defaults to `"online"` -- but the DB default is `'online'` so this is a minor concern.

The core issue: **for the current user's own status, we should NOT use presence-based online detection**. The current user is always "online" from their own perspective. We should just read `profile.status` directly.

### Plan

**File: `src/components/layout/UserPanelPopover.tsx`** (line 35)

Replace the presence-based status lookup with a direct read from `profile.status` for the current user's own popover. The user knows their own status -- no need to check presence:

```ts
// Before:
const currentStatus = (getUserStatus(profile) || "online") as UserStatus;

// After:  
const currentStatus = (p?.status || "online") as UserStatus;
```

Also remove the unused `usePresence` import.

**File: `src/components/layout/UserPanel.tsx`** (line 31)

Same fix -- the UserPanel shows the current user's own status, so read directly from profile:

```ts
// Before:
const status = (getUserStatus(profile) || "online") as UserStatus;

// After:
const status = ((profile as any)?.status || "online") as UserStatus;
```

Also remove the unused `usePresence` import.

This eliminates the race condition entirely for the current user's own status display. `usePresence` remains available for displaying *other* users' statuses elsewhere in the app.

