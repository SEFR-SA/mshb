

## Plan: Remove Static Save Button + Theme-Aware Floating Bar

### Changes

**1. `src/components/settings/tabs/ProfileTab.tsx`** — Delete the static "Save" button block

Lines 327-332 contain a hardcoded Save button at the bottom of the form:
```tsx
{/* Save */}
<div className="pt-2">
  <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
    {saving ? t("common.loading") : t("profile.save")}
  </Button>
</div>
```
Remove this entire block. Saving is now exclusively handled by the floating `UnsavedChangesBar`.

**2. `src/components/settings/UnsavedChangesBar.tsx`** — Dynamic theme color on the Save button

Currently the Save button uses `bg-green-600 hover:bg-green-700`. Replace this with the user's active theme primary color via the CSS variable `--color-primary` (set by the ThemeContext for all color presets).

- Read the CSS variable at render time using `getComputedStyle` or, simpler, apply it inline via `var()`.
- Replace the hardcoded green classes with an inline style:

```tsx
<Button
  size="sm"
  onClick={onSave}
  className="text-white hover:opacity-90"
  style={{ backgroundColor: "var(--color-primary, hsl(var(--primary)))" }}
>
```

The `var(--color-primary, ...)` reads the solid theme hex if active, falling back to the base HSL `--primary` for default/base themes. This requires no context import — pure CSS variable resolution.

### Files Changed
| File | Change |
|------|--------|
| `src/components/settings/tabs/ProfileTab.tsx` | Delete lines 327-332 (static Save button) |
| `src/components/settings/UnsavedChangesBar.tsx` | Replace `bg-green-600 hover:bg-green-700` with inline `style={{ backgroundColor }}` using CSS variable |

