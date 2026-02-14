

## Replace Sidebar Utility Buttons with a Single "Settings" Button

### Overview
Remove the three individual buttons (theme toggle, language toggle, sign out) from the sidebar bottom area and replace them with a single "Settings" button that navigates to the Settings page, since all three features are already available there.

### Changes

**`src/components/layout/AppLayout.tsx`**

1. **Remove buttons** (lines 96-111): Replace the entire row containing the theme toggle, language toggle, install prompt, and sign out buttons with a single Settings button:
   ```tsx
   <div className="flex items-center gap-2">
     {installPrompt && (
       <Button variant="ghost" size="icon" onClick={handleInstall} title={t("app.install")}>
         <Download className="h-4 w-4" />
       </Button>
     )}
     <NavLink to="/settings">
       <Button variant="ghost" size="icon" title={t("nav.settings")}>
         <Settings className="h-4 w-4" />
       </Button>
     </NavLink>
   </div>
   ```

2. **Clean up unused imports**: Remove `Moon`, `Sun`, `Globe`, `LogOut` from the lucide-react import since they are no longer used in this component. Also remove the `toggleLang` function and the `signOut` destructure if no longer referenced elsewhere in the file.

Note: The install prompt button is kept since that functionality is not available on the Settings page.

### Files Modified
- `src/components/layout/AppLayout.tsx`

