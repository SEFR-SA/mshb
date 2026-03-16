

# Replace Save Buttons with UnsavedChangesBar in Server Settings

## Scope

Four server settings tabs have inline Save buttons that need replacing with the shared `UnsavedChangesBar` component:

| Tab | Current pattern | Change needed |
|---|---|---|
| **ServerProfileTab** | Static `<Button>` at bottom | Add dirty tracking, show `UnsavedChangesBar`, remove button |
| **EngagementTab** | Static `<Button>` at bottom | Add dirty tracking for system/notif/inactive fields, show bar, remove button |
| **ServerTagTab** | Static `<Button>` at bottom | Add dirty tracking for tag fields, show bar, remove button |
| **RolesTab** | Custom inline unsaved banner (lines 536-549) | Replace with shared `UnsavedChangesBar` component |

**CommunityTab** — no changes needed (saves happen inline on select change).

## Implementation per tab

### 1. `ServerProfileTab.tsx`
- Store `initialName` and `initialDescription` refs (set on load from parent props via `useEffect`)
- Compute `isDirty = serverName !== initialName || description !== initialDescription`
- Remove the `<Button onClick={handleSave}>` block (lines 187-192)
- Add `<UnsavedChangesBar show={isDirty} onSave={handleSave} onReset={resetToInitial} />` at the bottom
- `onReset` restores name/description to initial values via parent setters

### 2. `EngagementTab.tsx`
- Store initial values for `systemChannelId`, `notifLevel`, `inactiveChannelId`, `inactiveTimeout` after load
- Compute `isDirty` by comparing current state to initial
- Remove the `<Button onClick={handleSave}>` block (lines 407-414)
- Add `<UnsavedChangesBar>` at bottom of the component
- `onReset` restores all four fields to initial values

### 3. `ServerTagTab.tsx`
- Store initial values for `tagName`, `tagBadge`, `tagColor`, `tagContainerColor` after load
- Compute `isDirty` by comparing current state to initial
- Remove the `<Button>` block (lines 389-396)
- Add `<UnsavedChangesBar>` at bottom
- `onReset` restores all tag fields

### 4. `RolesTab.tsx`
- Replace the custom inline banner (lines 536-549) with `<UnsavedChangesBar show={isDirty} onSave={handleSave} onReset={handleReset} />`
- Already has `isDirty`, `handleSave`, and `handleReset` — just swap the UI component

### Positioning note
Since the parent `ServerSettingsDialog` wraps tab content in a scrollable `max-w-3xl` container, each tab will render `<UnsavedChangesBar>` as its last child. The bar uses `absolute bottom-0` positioning which works within the existing `relative` content area. For RolesTab (which uses a custom layout), the bar replaces the existing sticky footer.

