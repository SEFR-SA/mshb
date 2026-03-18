

## Goal
Add a real-time online member count next to the existing total member count in the ServerMemberList header, counting members whose status is Online, Busy, Idle, or DND (excluding Invisible).

## Implementation

### File: `src/components/server/ServerMemberList.tsx`

**Compute online count** — After members are loaded, derive the count using the existing `getUserStatus` hook. Members are "online" if `getUserStatus` returns anything other than `"offline"` or `"invisible"`:

```ts
const onlineCount = members.filter((m) => {
  const s = getUserStatus({ user_id: m.user_id, status: m.profile?.status });
  return s !== "offline" && s !== "invisible";
}).length;
```

**Update the header** (line 223) to show both counts, matching Discord's style:

```tsx
<h3 className="text-xs font-semibold uppercase text-muted-foreground">
  {t("servers.members")} — {members.length} · {t("servers.online")} — {onlineCount}
</h3>
```

**Real-time** — This is already handled. The `usePresence` hook subscribes to presence changes and re-renders the component. The `getUserStatus` call will automatically reflect status changes in real time. Additionally, the existing realtime channel on `server_members` triggers a full reload when membership changes.

### Translation keys
Add `"online"` to both `src/i18n/en.ts` and `src/i18n/ar.ts` under the `servers` namespace (e.g., `"online": "Online"` / `"online": "متصل"`).

### No database or migration changes needed
All data is already available from profiles + presence.

