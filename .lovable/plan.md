
## Feature 1: Server Folders (Drag-to-Group)

### How it works
Users can drag one server icon on top of another in the Server Rail to create a folder. The folder appears as a stacked icon that expands on click to reveal the servers inside. Users can name the folder and pick a color for it.

### Database Changes
Create a new `server_folders` table:
- `id` (uuid, PK)
- `user_id` (text, NOT NULL) -- folders are per-user
- `name` (text, default 'Folder')
- `color` (text, default '#5865F2') -- hex color
- `position` (integer, default 0) -- ordering in the rail
- `created_at` (timestamptz)

Create a new `server_folder_items` table:
- `id` (uuid, PK)
- `folder_id` (uuid, FK to server_folders)
- `server_id` (text, NOT NULL)
- `position` (integer, default 0) -- ordering within folder
- `created_at` (timestamptz)

RLS policies: Users can only CRUD their own folders and folder items.

### UI Changes

**ServerRail.tsx** -- Major update:
- Add local state for folders (fetched from `server_folders` + `server_folder_items`)
- Implement HTML5 drag-and-drop on server icons:
  - `draggable` attribute on each server icon
  - `onDragStart` stores the dragged server ID
  - `onDragOver` / `onDrop` on other server icons detects a drop target
  - When dropped on another server: create a new folder containing both servers
  - When dropped on an existing folder: add server to that folder
- Render folders as a collapsed pill (showing stacked mini-avatars of first 3 servers) with a colored border matching the folder color
- Clicking a folder expands it inline (vertically) to show the contained server icons
- Right-click context menu on folders: Rename, Change Color, Remove Folder (ungroups servers back to rail)

**New component: `ServerFolderDialog.tsx`**
- Dialog for editing folder name and color
- Color picker with preset swatches (Discord-style: 10 preset colors + custom hex input)
- Text input for folder name

**New component: `ServerFolder.tsx`**
- Renders a single folder in the rail
- Collapsed state: stacked avatars pill with colored left border
- Expanded state: vertical list of server icons with a colored background tint
- Drop target for adding more servers
- Drag source for reordering

### Interaction Flow
1. User drags Server A onto Server B
2. A new folder is created in the database containing both servers
3. Both servers are removed from the loose server list and shown inside the folder
4. A dialog appears to name the folder and pick a color
5. User can right-click folder to rename/recolor/ungroup

---

## Feature 2: Custom Display Name Styling (Fonts + Gradients)

### How it works
Users can customize their display name with a decorative Unicode font and/or a gradient color. The reference image shows "Risk" rendered in a stylized font with a gradient. This is achieved by:
1. **Font styling**: Converting display name characters to Unicode mathematical/fancy character sets (e.g., Bold Script, Fraktur, Double-Struck). The actual `display_name` column stores the Unicode-transformed text directly -- no special rendering needed.
2. **Gradient colors**: Storing two gradient color values in the profile. Display names are rendered with a CSS `background: linear-gradient(...)` + `background-clip: text` effect.

### Database Changes
Add two new columns to `profiles`:
- `name_gradient_start` (text, nullable) -- hex color for gradient start (e.g., "#ff0000")
- `name_gradient_end` (text, nullable) -- hex color for gradient end (e.g., "#0000ff")

When both are null, the display name renders in the default text color.

### UI Changes

**Settings.tsx** -- Add a "Name Style" section:
- A row of font style buttons (Normal, Bold, Italic, Script, Fraktur, Double-Struck, etc.)
- Clicking a font style converts the current display name text to that Unicode character set in real-time (preview updates instantly)
- Two color pickers for gradient start and end colors
- A "Clear Gradient" button to reset to default
- Live preview of the styled name

**New utility: `src/lib/unicodeFonts.ts`**
- Contains character mapping tables for each font style (A-Z, a-z, 0-9)
- Export a `convertToFont(text: string, style: FontStyle): string` function
- Supported styles: Normal, Bold, Italic, BoldItalic, Script, BoldScript, Fraktur, BoldFraktur, DoubleStruck, Monospace, SansSerif, SansBold

**New component: `src/components/StyledDisplayName.tsx`**
- Accepts `displayName`, `gradientStart`, `gradientEnd` props
- If gradient colors are set, renders with CSS gradient text effect
- Used everywhere display names appear: chat messages, sidebars, member lists, profile panels, user context menus

**Files to update for StyledDisplayName integration:**
- `src/pages/Chat.tsx` -- DM message author names
- `src/pages/GroupChat.tsx` -- group message author names  
- `src/components/server/ServerChannelChat.tsx` -- server message author names
- `src/components/server/ServerMemberList.tsx` -- member list names
- `src/components/chat/ChatSidebar.tsx` -- conversation list names
- `src/components/chat/UserProfilePanel.tsx` -- profile panel name
- `src/components/chat/ActiveNowPanel.tsx` -- active users names
- `src/pages/Settings.tsx` -- profile preview

### Technical Details

The Unicode font conversion works by mapping ASCII characters to their Unicode mathematical equivalents. For example, "Risk" in Bold Script becomes "??????????????????????" (U+1D4E1, U+1D4F2, etc.). Since these are standard Unicode characters, they are stored as plain text in the database and render correctly everywhere without any special font loading.

The gradient effect uses standard CSS:
```css
background: linear-gradient(90deg, var(--start), var(--end));
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

| Area | Files |
|---|---|
| Database | Migration: `server_folders`, `server_folder_items` tables + `profiles` columns |
| Server Folders | `ServerRail.tsx`, new `ServerFolder.tsx`, new `ServerFolderDialog.tsx` |
| Name Styling | New `unicodeFonts.ts`, new `StyledDisplayName.tsx`, `Settings.tsx` |
| Integration | 8+ existing files updated to use `StyledDisplayName` |
| i18n | `en.ts`, `ar.ts` updated with new translation keys |
