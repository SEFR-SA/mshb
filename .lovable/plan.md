

## Add Custom Channel Sections (Categories)

### Overview
Allow server admins to create custom category/section names (e.g., "Call of Duty Voice Channels", "Call of Duty Text Channels") instead of being limited to the default "Text Channels" and "Voice Channels". Each section remains collapsible with the chevron toggle.

### Changes

**File: `src/components/server/ChannelSidebar.tsx`**

1. **Add "Create Section" button** visible to admins at the bottom of the channel list (or via a small `+` icon next to the sections area). Clicking it opens a small dialog/input to type a new section name.

2. **Add state for custom categories**: Track available categories by deriving them from existing channels plus any newly created ones. Add state:
   - `createSectionOpen` (boolean) -- controls the "Create Section" dialog
   - `newSectionName` (string) -- the name being typed

3. **Create Section dialog**: A simple dialog with an input for the section name and a select for the default channel type (text/voice). When confirmed, it creates a new channel inside that section (e.g., a "general" channel) so the section appears immediately. Alternatively, it just opens the existing "Create Channel" dialog with the new category pre-filled.

4. **Update Create Channel dialog**: Replace the hardcoded `newCategory` with a `Select` dropdown listing all existing categories plus an "Add new section..." option. When "Add new section..." is chosen, show an input for the custom name.

5. **Approach chosen**: Add a category selector to the existing Create Channel dialog, plus a standalone "Create Section" button for admins in the sidebar header area.

### Detailed Implementation

**Create Channel dialog changes** (lines ~579-630):
- Add a `Select` for category before the channel type selector
- Options: all unique existing categories + "+ New Section..."
- When "+ New Section..." is selected, show an `Input` for custom section name
- The new category name gets saved as the channel's `category` value in the database

**Sidebar UI** (around line 411):
- Add a small "Create Section" button (a `FolderPlus` icon) next to the server name or at the bottom of the channel list, visible only to admins
- This button opens the Create Channel dialog with a blank new category input focused

**State additions**:
```
const [customCategory, setCustomCategory] = useState("");
const [useCustomCategory, setUseCustomCategory] = useState(false);
```

**In `handleCreateChannel`**: Use `customCategory` if `useCustomCategory` is true, otherwise use `newCategory` from the select.

**Existing categories derived from channels**:
```
const existingCategories = [...new Set(channels.map(ch => ch.category))];
```

### Files Modified

| File | Changes |
|---|---|
| `src/components/server/ChannelSidebar.tsx` | Add category selector to Create Channel dialog; add "Create Section" button for admins; derive existing categories from channels |

No database changes needed -- the `category` column on the `channels` table already stores free-text category names.

