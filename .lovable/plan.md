

## Fix Messages Icon Active State in Server Rail

### Problem
The Messages (home) icon in the Server Rail only shows the accent color when the route is exactly `/`. However, since the app now auto-redirects to the last DM thread (`/chat/:threadId`), the icon loses its active styling. The Friends icon works correctly because `/friends` remains the route.

### Solution
Update the active condition for the Messages button in `src/components/server/ServerRail.tsx` to also match `/chat/*` and `/group/*` routes, since those are all part of the "Messages" section.

### Technical Details

**File: `src/components/server/ServerRail.tsx` (line 103-106)**

Change the condition from:
```
location.pathname === "/"
```
To:
```
location.pathname === "/" || location.pathname.startsWith("/chat/") || location.pathname.startsWith("/group/")
```

This ensures the Messages icon stays highlighted with the user's accent color whenever they are viewing any DM thread, group chat, or the inbox -- all routes that fall under "Messages."

### Files Modified

| File | Changes |
|---|---|
| `src/components/server/ServerRail.tsx` | Update active state condition for Messages button to include `/chat/*` and `/group/*` routes |

