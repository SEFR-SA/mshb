

## Add Status Badge & Username to Sidebar Profile

### Overview
Add a status indicator badge on the avatar (like Discord) and show the username below the display name in the bottom-left user area of the sidebar.

### Changes

**`src/components/layout/AppLayout.tsx`**

1. **Import** `StatusBadge` and `UserStatus` from `@/components/StatusBadge`, and `usePresence` from `@/hooks/usePresence`

2. **Add presence hook**: Call `usePresence()` and use `getUserStatus(profile)` to get the current status

3. **Wrap Avatar with a relative container** and add a `StatusBadge` positioned at the bottom-right of the avatar (like Discord):
   ```tsx
   <div className="relative shrink-0">
     <Avatar className="h-8 w-8">
       <AvatarImage src={profile?.avatar_url || ""} />
       <AvatarFallback ...>{initials}</AvatarFallback>
     </Avatar>
     <StatusBadge status={status} size="sm" className="absolute bottom-0 end-0" />
   </div>
   ```

4. **Update the text section** (lines 114-117) to show username under display name:
   ```tsx
   <div className="truncate">
     <p className="text-sm font-medium truncate">
       {profile?.display_name || profile?.username || "User"}
     </p>
     {profile?.username && (
       <p className="text-[11px] text-muted-foreground truncate">
         @{profile.username}
       </p>
     )}
   </div>
   ```
   This replaces the current status_text line with the username, shown slightly smaller than the display name.

### Files Modified
- `src/components/layout/AppLayout.tsx` -- add StatusBadge on avatar, show @username below display name

