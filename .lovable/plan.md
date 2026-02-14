

## Immediate UI Updates on Channel Delete

### Problem
When a channel is deleted, the toast notification appears but the channel remains visible in the sidebar until navigating away. The realtime subscription should trigger a refetch, but there's a delay or the event isn't being processed quickly enough.

### Solution
Add optimistic UI updates -- immediately remove the channel from local state when the delete action succeeds, rather than waiting for the realtime subscription to refetch.

### Changes

**`src/components/server/ChannelSidebar.tsx`**

In the `handleDeleteChannel` function (around line 253), after the successful Supabase delete call:
- Add `setChannels(prev => prev.filter(c => c.id !== deleteChannelId))` right after the delete completes
- This removes the channel from the local list instantly, so the user sees it disappear immediately
- The realtime subscription will still refetch in the background for consistency, but the user won't notice any delay

Updated function:
```
const handleDeleteChannel = async () => {
  if (!deleteChannelId) return;
  const idToDelete = deleteChannelId;
  setDeleteChannelId(null);
  setChannels(prev => prev.filter(c => c.id !== idToDelete));
  await supabase.from("channels").delete().eq("id", idToDelete);
  toast({ title: t("channels.deleted") });
};
```

### Files Summary

| File | Action | Changes |
|------|--------|---------|
| `src/components/server/ChannelSidebar.tsx` | Modify | Add optimistic state removal in `handleDeleteChannel` |

