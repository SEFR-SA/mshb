

## Fix: Profile Button Opens Drawer on Mobile

### Problem
Line 448: The profile toggle button calls `setShowProfile(!showProfile)`, but the `UserProfilePanel` only renders on desktop (line 763: `!isMobile && showProfile`). On mobile, the button does nothing.

### Solution
On mobile, instead of toggling `showProfile`, call the existing `openProfile(otherUserId)` from `useUserProfile()` context — which already renders as a Drawer on mobile via `UserProfileModal`.

### Changes

**`src/pages/Chat.tsx`**:
1. Import `useUserProfile` from `@/contexts/UserProfileContext`
2. Update the button's `onClick` (line 448) to branch by platform:

```tsx
onClick={() => {
  if (isMobile) {
    openProfile(otherUserId);
  } else {
    setShowProfile(!showProfile);
  }
}}
```

One import addition, one line change. No new components.

