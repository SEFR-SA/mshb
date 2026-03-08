

## Plan: Show Mutual Servers & Friends Sections Even When Empty

The sections are currently hidden because they only render when `mutualServers.length > 0` / `mutualFriends.length > 0`. In your case, the other user shares 0 servers and 0 mutual friends (excluding each other), so both sections are invisible.

### Fix

In `src/components/chat/UserProfilePanel.tsx`, remove the `length > 0` guards on lines 186 and 212 so the collapsible sections always appear (when viewing another user). When the count is 0, they'll show "Mutual Servers -- 0" and "Mutual Friends -- 0" collapsed with no items inside.

**Changes:**
- Line 186: `{!isSelf && mutualServers.length > 0 && (` → `{!isSelf && (`
- Line 212: `{!isSelf && mutualFriends.length > 0 && (` → `{!isSelf && (`

Single file changed: `src/components/chat/UserProfilePanel.tsx`

