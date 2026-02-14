

## Add Skeleton Loading to the Messages (Inbox) Page

### Overview
The Inbox page (`src/pages/Inbox.tsx`) currently shows an empty state while DM and group threads are being fetched. This will add a shimmer skeleton loading state using the existing `SidebarItemSkeleton` component.

### Changes

**File: `src/pages/Inbox.tsx`**

1. Add a `loading` state initialized to `true`
2. Set `loading = false` at the end of `loadInbox()` after items are populated
3. In the thread list area, show `SidebarItemSkeleton` (count=8) while loading
4. Wrap the real thread list in `animate-fade-in` for a smooth transition
5. Import `SidebarItemSkeleton` from `@/components/skeletons/SkeletonLoaders`

**Pattern:**
```
const [loading, setLoading] = useState(true);

// End of loadInbox():
setItems(all);
setLoading(false);

// In JSX thread list area:
{loading ? (
  <SidebarItemSkeleton count={8} />
) : (
  <div className="animate-fade-in">
    {items.length === 0 && !search.trim() && ( /* empty state */ )}
    {items.map((item) => ( /* thread buttons */ ))}
  </div>
)}
```

### Files Modified

| File | Changes |
|---|---|
| `src/pages/Inbox.tsx` | Add `loading` state, show `SidebarItemSkeleton` while fetching, fade-in real content |

