

## Add Skeleton Loading States to Chat, GroupChat, and Settings

### Overview
Add shimmer skeleton loading to the DM message area, Group message area, and Settings page while data is being fetched. Uses the existing `MessageSkeleton` component and a new `SettingsSkeleton`.

---

### 1. New Skeleton: SettingsSkeleton

**File:** `src/components/skeletons/SkeletonLoaders.tsx`

Add a new `SettingsSkeleton` export that mimics the Settings page layout:
- A banner placeholder (h-36 rounded rectangle)
- Avatar circle (h-20 w-20) with two text bars beside it
- Two Card-shaped blocks with 4-5 label+input skeleton rows each
- Two full-width button skeletons at the bottom

---

### 2. Chat.tsx -- Message Area Skeleton

**File:** `src/pages/Chat.tsx`

- Add `const [messagesLoading, setMessagesLoading] = useState(true);`
- In `loadMessages`, after setting messages (the non-`before` branch, line 195), add `setMessagesLoading(false);`
- Also set `setMessagesLoading(true)` when `threadId` changes (reset on navigation)
- In the Messages `<div>` (line 407), wrap existing content:
  ```
  {messagesLoading ? <MessageSkeleton count={6} /> : (
    <>
      {hasMore && ...}
      {visibleMessages.map(...)}
    </>
  )}
  ```
- Import `MessageSkeleton` from `@/components/skeletons/SkeletonLoaders`

---

### 3. GroupChat.tsx -- Message Area Skeleton

**File:** `src/pages/GroupChat.tsx`

- Add `const [messagesLoading, setMessagesLoading] = useState(true);`
- In `loadMessages`, after setting messages (non-`before` branch, line 144), add `setMessagesLoading(false);`
- Reset `setMessagesLoading(true)` when `groupId` changes
- In the Messages `<div>` (line 323), wrap existing content:
  ```
  {messagesLoading ? <MessageSkeleton count={6} /> : (
    <>
      {hasMore && ...}
      {visibleMessages.map(...)}
    </>
  )}
  ```
- Import `MessageSkeleton` from `@/components/skeletons/SkeletonLoaders`

---

### 4. Settings.tsx -- Profile Loading Skeleton

**File:** `src/pages/Settings.tsx`

- The `profile` object comes from `useAuth()` and is `null` until fetched
- Add a loading check at the top of the return: if `!profile`, render `<SettingsSkeleton />`
- Import `SettingsSkeleton` from `@/components/skeletons/SkeletonLoaders`

---

### Files Modified

| File | Changes |
|---|---|
| `src/components/skeletons/SkeletonLoaders.tsx` | Add `SettingsSkeleton` component |
| `src/pages/Chat.tsx` | Add `messagesLoading` state + `MessageSkeleton` |
| `src/pages/GroupChat.tsx` | Add `messagesLoading` state + `MessageSkeleton` |
| `src/pages/Settings.tsx` | Show `SettingsSkeleton` while profile is null |

