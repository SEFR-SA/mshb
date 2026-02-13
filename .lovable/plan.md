

# Fix Group Creation + Add Install to Desktop Button

## Issue 1: Group Creation Still Fails

### Root Cause
The INSERT query in `CreateGroupDialog.tsx` uses `.insert(...).select("id").single()`, which requires **both** INSERT and SELECT permissions. The SELECT policy on `group_threads` checks `is_group_member(auth.uid(), id)`, but at insert time the user hasn't been added to `group_members` yet -- so the SELECT check fails, causing the RLS error.

### Fix
Run a database migration to update the SELECT policy on `group_threads` to also allow the group creator to see the group:

```sql
DROP POLICY IF EXISTS "Members can view group threads" ON public.group_threads;
CREATE POLICY "Members can view group threads"
  ON public.group_threads FOR SELECT
  TO authenticated
  USING (is_group_member(auth.uid(), id) OR created_by = auth.uid());
```

---

## Issue 2: Add "Install to Desktop" Button

The app is already configured as a PWA (manifest.json, service worker, icons exist). It just needs a visible install button that uses the browser's `beforeinstallprompt` event.

### Changes to `src/pages/Settings.tsx`
- Add a "Download to Desktop" / "Install App" button in the settings page
- Use the `beforeinstallprompt` event to capture the install prompt
- Show the button only when the browser supports installation (not already installed)
- Add a `Download` icon from lucide-react

### Changes to `src/components/layout/AppLayout.tsx`
- Add a small install button in the desktop sidebar's bottom area (near theme/language toggles) so it's always accessible

---

## Technical Details

### PWA Install Logic
```typescript
const [installPrompt, setInstallPrompt] = useState<any>(null);

useEffect(() => {
  const handler = (e: Event) => {
    e.preventDefault();
    setInstallPrompt(e);
  };
  window.addEventListener("beforeinstallprompt", handler);
  return () => window.removeEventListener("beforeinstallprompt", handler);
}, []);

const handleInstall = async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  setInstallPrompt(null);
};
```

### i18n
- Add `app.install` key: "Install App" / "تثبيت التطبيق"

### Files Modified
- **Database migration**: Fix `group_threads` SELECT policy
- `src/components/layout/AppLayout.tsx`: Add install button in sidebar
- `src/pages/Settings.tsx`: Add install button in settings
- `src/i18n/en.ts` and `src/i18n/ar.ts`: Add install translation key
