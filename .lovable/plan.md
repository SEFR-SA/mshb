

## Add Friends Button to Server Rail & Update Icons

### Overview
Add a "Friends" button below the current home/messages button in the Server Rail, and update both icons to clearly indicate their purpose.

### Changes

**`src/components/server/ServerRail.tsx`**

1. **Update imports**: Add `MessageSquare` and `Users` from `lucide-react`

2. **Replace the home button icon** (line 65): Change `✦` to `<MessageSquare className="h-5 w-5" />` to indicate this is the messages/inbox screen

3. **Add a Friends button** right after the home button (before the Separator on line 71):
   ```tsx
   <Tooltip>
     <TooltipTrigger asChild>
       <NavLink
         to="/friends"
         className={({ isActive }) =>
           `flex items-center justify-center w-12 h-12 rounded-2xl transition-all hover:rounded-xl ${
             isActive ? "bg-primary text-primary-foreground rounded-xl" : "bg-sidebar-accent text-sidebar-foreground hover:bg-primary/20"
           }`
         }
       >
         <Users className="h-5 w-5" />
       </NavLink>
     </TooltipTrigger>
     <TooltipContent side="right">{t("nav.friends")}</TooltipContent>
   </Tooltip>
   ```

### Files Modified
- `src/components/server/ServerRail.tsx` -- replace text icon with MessageSquare, add Friends button with Users icon

