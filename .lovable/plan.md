

## Fix Messages and Friends Button Styling in Server Rail

### Problem
The Messages and Friends NavLink buttons at the top of the Server Rail render with a different visual appearance (lighter/more transparent container) compared to the Create Server and Join Server buttons, despite having similar CSS classes. This is because `NavLink` renders an `<a>` tag which can render background colors slightly differently than native `<button>` elements.

### Solution
Convert the Messages and Friends items from `NavLink` components to `<button>` elements (matching Create/Join), and use `useNavigate` + `useLocation` for navigation and active state detection. This ensures identical DOM elements and rendering.

### Changes

**`src/components/server/ServerRail.tsx`**

1. **Add imports**: Import `useNavigate` and `useLocation` from `react-router-dom` (remove `NavLink` import if only used here -- but it's also used for servers, so keep it)

2. **Replace Messages NavLink** (lines 56-66) with a `<button>` that uses `onClick={() => navigate("/")}` and determines active state via `location.pathname === "/"`:
   ```tsx
   <button
     onClick={() => navigate("/")}
     className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all hover:rounded-xl ${
       location.pathname === "/"
         ? "bg-primary text-primary-foreground rounded-xl"
         : "bg-sidebar-accent text-sidebar-foreground hover:bg-primary/20 hover:text-primary"
     }`}
   >
     <MessageSquare className="h-5 w-5" />
   </button>
   ```

3. **Replace Friends NavLink** (lines 73-82) with the same pattern using `location.pathname === "/friends"` and `navigate("/friends")`

4. Server NavLinks (line 93-107) stay as `NavLink` since they work fine with the Avatar component

### Files Modified
- `src/components/server/ServerRail.tsx` -- convert Messages and Friends from NavLink to button elements for consistent rendering
