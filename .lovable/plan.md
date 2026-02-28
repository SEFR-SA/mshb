

## Fix Build Errors to Unblock Testing

The preview is currently broken due to 3 TypeScript errors where Supabase query results can't be directly cast to custom types. The fix is mechanical — add `unknown` as an intermediate cast.

### Changes

**File: `src/components/server/settings/EngagementTab.tsx`**
- Line 64: Change `(ch as Channel[])` → `(ch as unknown as Channel[])`

**File: `src/components/server/settings/RolesTab.tsx`**
- Line 108: Change `(data as ServerRole[])` → `(data as unknown as ServerRole[])`
- Line 161: Change `data as ServerRole` → `data as unknown as ServerRole`

### After Fix

Once the preview loads, I will use browser tools to navigate to Settings > Appearance, select multiple color theme presets, and verify that the app's background gradient and accent colors actually change. I will screenshot before/after to report results.

