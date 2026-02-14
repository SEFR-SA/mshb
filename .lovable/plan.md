

## Auto-Open Last DM + Bottom Sidebar Panel

### Overview
When users click the Messages icon and land on the `/` route, instead of showing just the inbox list, the app will automatically detect the most recent DM thread and redirect to `/chat/{threadId}`, displaying the full 3-panel layout (sidebar + chat + profile). Additionally, the ChatSidebar will get a bottom panel with the user's display name, username, settings icon, and mute/deafen buttons -- matching the ChannelSidebar's bottom panel.

### Changes

**File: `src/pages/Inbox.tsx`**
1. Add an auto-redirect effect: on mount, query `dm_threads` ordered by `last_message_at DESC`, take the first result, and `navigate(/chat/{id})` if found
2. Keep the current inbox UI as a fallback for users with no DM threads

**File: `src/components/chat/ChatSidebar.tsx`**
1. Add a bottom panel (below the thread list, pinned to the bottom) containing:
   - User avatar with status badge, display name, and @username
   - Mute button (Mic/MicOff icon)
   - Deafen button (Headphones/HeadphoneOff icon)
   - Settings icon linking to `/settings`
2. Import `useAudioSettings` for mute/deafen state
3. Import `usePresence` for user status badge
4. Match the styling from `ChannelSidebar.tsx` lines 718-755

### Technical Details

**Inbox auto-redirect (`src/pages/Inbox.tsx`):**
```typescript
useEffect(() => {
  if (!user) return;
  (async () => {
    const { data } = await supabase
      .from("dm_threads")
      .select("id")
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) navigate(`/chat/${data.id}`, { replace: true });
  })();
}, [user]);
```

**ChatSidebar bottom panel (`src/components/chat/ChatSidebar.tsx`):**
```typescript
// At the bottom of the sidebar, after the thread list:
<div className="border-t border-border/50 mt-auto">
  <div className="flex items-center gap-1 px-2 py-1.5">
    <Button variant="ghost" size="icon" onClick={toggleGlobalMute}>
      {globalMuted ? <MicOff /> : <Mic />}
    </Button>
    <Button variant="ghost" size="icon" onClick={toggleGlobalDeafen}>
      {globalDeafened ? <HeadphoneOff /> : <Headphones />}
    </Button>
    <NavLink to="/settings">
      <Button variant="ghost" size="icon"><Settings /></Button>
    </NavLink>
  </div>
  <NavLink to="/settings" className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50">
    <Avatar>...</Avatar>
    <div>
      <p className="text-sm font-medium">{displayName}</p>
      <p className="text-[11px] text-muted-foreground">@{username}</p>
    </div>
  </NavLink>
</div>
```

### Files Modified

| File | Changes |
|---|---|
| `src/pages/Inbox.tsx` | Add useEffect to auto-redirect to last DM thread on mount |
| `src/components/chat/ChatSidebar.tsx` | Add bottom panel with user profile, mute/deafen buttons, and settings link |

No database changes required.
