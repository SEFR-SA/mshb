

## Skeleton Loading States Across the App

### Overview
Add Discord-style shimmer skeleton loading states to all major data-fetching areas. While data is loading, show placeholder skeletons that match the shape of real content. The skeletons use the existing `bg-muted` color (which already adapts to light/dark/color themes) with a shimmer animation overlay.

### 1. Enhanced Skeleton Component with Shimmer Animation

**File:** `src/components/ui/skeleton.tsx`

Replace the basic `animate-pulse` skeleton with a shimmer effect using a CSS `linear-gradient` that sweeps left-to-right. The shimmer uses `bg-muted` as the base (theme-aware) with a lighter highlight band.

**File:** `src/index.css`

Add a `@keyframes shimmer` animation:
```
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.animate-shimmer {
  background: linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--accent)) 50%, hsl(var(--muted)) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
}
```

This automatically matches the user's selected Color Theme since it references `--muted` and `--accent` CSS variables.

---

### 2. Reusable Skeleton Sub-Components

**New file:** `src/components/skeletons/SkeletonLoaders.tsx`

Create purpose-built skeleton components for each area:

- **`SidebarItemSkeleton`** -- Avatar circle (36px) + two text bars (name + message preview), repeated 8 times
- **`ServerRailSkeleton`** -- 5 circular server icon placeholders (48px circles)
- **`MessageSkeleton`** -- Avatar circle + author name bar + 1-2 content bars of varying widths, repeated 6 times
- **`MemberListSkeleton`** -- Small avatar circle + username bar, repeated 8 times
- **`ChannelListSkeleton`** -- Category header bar + 4-5 channel name bars with hash icon placeholder
- **`FriendListSkeleton`** -- Avatar + name + status bars, repeated 6 times

Each uses the `Skeleton` component internally, producing a cohesive shimmer effect.

---

### 3. Add Loading States to Components

Each component gets a `loading` boolean state (starts `true`, set `false` after data arrives). While `loading`, render the skeleton; otherwise render the real content.

**Components modified:**

| Component | Skeleton Used | Count |
|---|---|---|
| `src/components/chat/ChatSidebar.tsx` | `SidebarItemSkeleton` | 8 items |
| `src/components/server/ServerRail.tsx` | `ServerRailSkeleton` | 5 circles |
| `src/components/server/ChannelSidebar.tsx` | `ChannelListSkeleton` | 5 channels |
| `src/components/server/ServerChannelChat.tsx` | `MessageSkeleton` | 6 messages |
| `src/components/server/ServerMemberList.tsx` | `MemberListSkeleton` | 8 members |
| `src/pages/Chat.tsx` | `MessageSkeleton` | 6 messages |
| `src/pages/GroupChat.tsx` | `MessageSkeleton` | 6 messages |
| `src/pages/Friends.tsx` | `FriendListSkeleton` | 6 items |

**Pattern for each component:**
```
const [loading, setLoading] = useState(true);

// In the async load function:
const loadData = async () => {
  // ... existing fetch logic ...
  setLoading(false);
};

// In JSX:
{loading ? <SidebarItemSkeleton count={8} /> : (
  // ... existing content ...
)}
```

---

### 4. Smooth Transition

Wrap the real content in an `animate-fade-in` class (already exists in the project's Tailwind config) so the transition from skeleton to content is smooth rather than a hard swap.

---

### Summary of Files Modified

| File | Changes |
|---|---|
| `src/components/ui/skeleton.tsx` | Add shimmer class support |
| `src/index.css` | Add `@keyframes shimmer` + `.animate-shimmer` |
| `src/components/skeletons/SkeletonLoaders.tsx` | New file with all skeleton variants |
| `src/components/chat/ChatSidebar.tsx` | Add `loading` state + sidebar skeleton |
| `src/components/server/ServerRail.tsx` | Add `loading` state + rail skeleton |
| `src/components/server/ChannelSidebar.tsx` | Add `loading` state + channel skeleton |
| `src/components/server/ServerChannelChat.tsx` | Add `loading` state + message skeleton |
| `src/components/server/ServerMemberList.tsx` | Add `loading` state + member skeleton |
| `src/pages/Chat.tsx` | Add `loading` state + message skeleton |
| `src/pages/GroupChat.tsx` | Add `loading` state + message skeleton |
| `src/pages/Friends.tsx` | Add `loading` state + friend skeleton |
