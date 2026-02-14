

## Add Mobile Sidebar Button to Access Servers

### Problem
On mobile, the Server Rail is hidden (`{!isMobile && <ServerRail />}`). Users on Messages, Friends, Settings, or Profile pages have no way to navigate to their servers.

### Solution
Add a hamburger/menu button in the mobile top header (line 56-58) that opens a Sheet (slide-in drawer) containing the ServerRail component. This follows the common mobile pattern of a slide-out navigation panel.

### Changes

**`src/components/layout/AppLayout.tsx`**

1. Add state: `const [serverDrawerOpen, setServerDrawerOpen] = useState(false)`
2. Import `Sheet`, `SheetContent`, `SheetTrigger` from `@/components/ui/sheet`, and `Menu` icon from `lucide-react`
3. Add a `Menu` button to the left side of the mobile header (line 57):
   ```
   <button onClick={() => setServerDrawerOpen(true)}>
     <Menu className="h-5 w-5" />
   </button>
   ```
4. Add a `Sheet` with `side="left"` that renders `<ServerRail />` inside it, styled to fit the drawer

**`src/components/server/ServerRail.tsx`**

5. Accept an optional `onNavigate` callback prop so the drawer can close when a server/nav item is clicked
6. Call `onNavigate?.()` inside the navigate handlers and server NavLink `onClick`

### Visual Result

```text
Mobile Header (before):
+------------------------------------------+
|  * Galaxy Chat                           |
+------------------------------------------+

Mobile Header (after):
+------------------------------------------+
| [=]  * Galaxy Chat                       |
+------------------------------------------+

Tapping [=] slides in from left:
+----------------+
| [Messages]     |
| [Friends]      |
| -------------- |
| Server 1       |
| Server 2       |
| -------------- |
| [+] Create     |
| [->] Join      |
+----------------+
```

### Files Modified
- `src/components/layout/AppLayout.tsx` -- add Menu button in mobile header + Sheet with ServerRail
- `src/components/server/ServerRail.tsx` -- add optional `onNavigate` prop to close drawer on navigation
