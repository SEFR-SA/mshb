

## Drag-and-Drop Channel/Section Reordering + Section Rename/Delete

### Overview
Add drag-and-drop reordering for both channels within sections and sections themselves, plus the ability to rename or delete empty sections. All admin-only features.

### 1. Drag-and-Drop Reordering

Since the project doesn't have a DnD library installed, we'll use the native HTML5 Drag and Drop API to avoid adding dependencies. This keeps things lightweight and works well for a simple vertical list.

**How it works:**
- Each channel row and each section header gets `draggable="true"` (admin only)
- Visual feedback: a subtle highlight line shows the drop target position
- On drop, reorder the `position` values in the database
- Sections can be reordered by dragging their headers
- Channels can be dragged between sections (updates `category` + `position`)

**State additions:**
- `dragItem` -- tracks what's being dragged (channel id or category name)
- `dragType` -- "channel" or "section"
- `dragOverTarget` -- where the drop indicator should show

**Database updates on drop:**
- Batch update `position` values for reordered channels via multiple UPDATE calls
- If a channel is dragged to a different section, update its `category` column too

### 2. Rename Section

**UI:** Right-click context menu or a small dropdown (using existing `DropdownMenu`) on the section header with "Rename" and "Delete" options (admin only).

**Behavior:**
- Clicking "Rename" turns the section header text into an inline input
- On blur or Enter, updates all channels in that category with the new category name
- Database: `UPDATE channels SET category = newName WHERE server_id = X AND category = oldName`

**State additions:**
- `renamingCategory` -- the category currently being renamed (or null)
- `renameCategoryValue` -- the new name being typed

### 3. Delete Empty Section

**UI:** "Delete" option in the same section dropdown menu.

**Behavior:**
- Only enabled/visible when the section has zero channels
- Shows a confirmation dialog before deleting
- Since sections are derived from channel categories (no separate table), deleting an empty section is essentially a no-op -- it simply disappears when no channels reference it
- However, if the user created a section via "Create Section" and hasn't added channels yet, we need a way to track it. We'll handle this by: if the section has channels, show "Section not empty" toast. If empty, it naturally disappears (already handled).

### Technical Details

**File: `src/components/server/ChannelSidebar.tsx`**

New state variables:
```
const [dragItem, setDragItem] = useState<string | null>(null);
const [dragType, setDragType] = useState<"channel" | "section" | null>(null);
const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
const [renameCategoryValue, setRenameCategoryValue] = useState("");
const [deleteSectionName, setDeleteSectionName] = useState<string | null>(null);
```

Section header changes (around line 428-441):
- Add `draggable={isAdmin}` to the section container div
- Add drag event handlers: `onDragStart`, `onDragOver`, `onDragEnd`
- Add a `DropdownMenu` with Rename and Delete options (admin only), replacing or supplementing the `+` button
- When `renamingCategory === category`, render an `Input` instead of the text span

Channel row changes (around lines 450-505):
- Add `draggable={isAdmin}` to each channel's outer div
- Add drag event handlers for channel-level reordering
- Show a visual drop indicator (a colored line) at the drag-over position

New handler functions:
```
// Rename all channels in a category
const handleRenameCategory = async (oldName: string, newName: string) => {
  if (!newName.trim() || newName === oldName) { setRenamingCategory(null); return; }
  await supabase.from("channels").update({ category: newName.trim() }).eq("server_id", serverId).eq("category", oldName);
  setRenamingCategory(null);
};

// Reorder channels after drag-drop
const handleChannelDrop = async (draggedId: string, targetId: string, targetCategory: string) => {
  // Compute new positions and category, then batch update
};

// Reorder sections after drag-drop
const handleSectionDrop = async (draggedCategory: string, targetCategory: string) => {
  // Reorder by updating position of first channel in each category
};
```

Drop indicator styling:
```
// A 2px blue line shown between channels at the drop target
<div className="h-0.5 bg-primary rounded-full mx-2" />
```

### Files Modified

| File | Changes |
|---|---|
| `src/components/server/ChannelSidebar.tsx` | Add drag-and-drop handlers, section rename inline editing, section delete with confirmation, dropdown menu on section headers |

No database schema changes needed -- reordering uses the existing `position` column and renaming uses the existing `category` column.

