

## Plan: Add Keybinds Tab to Settings

### 1. Create `src/components/settings/tabs/KeybindsTab.tsx`

- **Header**: "Keybinds" title + description text, with an "Add a Keybind" primary `Button` aligned top-right.
- **`KbdKey` inline component**: Renders a single key as a `<kbd>` element styled with `bg-muted border border-border rounded px-2 py-1 text-xs font-mono`. A `KeyCombo` helper renders multiple keys separated by `+`.
- **Two sections** using the same card style as other settings tabs (`rounded-xl border border-border/50 bg-muted/10 p-4`):
  - **Messages**: E, Backspace, P, +, F, Ctrl+C, Alt+Enter
  - **Voice & Video**: Ctrl+Shift+M, Ctrl+Shift+D, Ctrl+Enter, Esc, Ctrl+Alt+S, Ctrl+Alt+E
- Each row: label on the left, key combo on the right, consistent with the toggle-row pattern used in NotificationsTab.
- Accepts `setUnsaved`/`clearUnsaved` props for interface consistency (unused for now since keybinds are read-only defaults).

### 2. Wire into `src/components/settings/SettingsModal.tsx`

- Add `"keybinds"` to the `TabId` union type.
- Import `Keyboard` icon from `lucide-react`.
- Add `{ id: "keybinds", labelKey: "settings.keybinds", icon: Keyboard }` to the App Settings nav group, after "voice".
- Lazy-import `KeybindsTab` and add it to `TAB_COMPONENTS`.

### 3. Add i18n key

- Add `"settings.keybinds": "Keybinds"` to `src/i18n/en.ts` and the Arabic equivalent to `src/i18n/ar.ts`.

### Files Changed

| File | Change |
|------|--------|
| `src/components/settings/tabs/KeybindsTab.tsx` | **New** — keybinds display with two sections |
| `src/components/settings/SettingsModal.tsx` | Add keybinds to TabId, nav, lazy import, tab map |
| `src/i18n/en.ts` | Add `settings.keybinds` translation |
| `src/i18n/ar.ts` | Add `settings.keybinds` Arabic translation |

