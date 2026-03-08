

## Fix: Align UserPanel and Chat Input Bottom Spacing

### The Problem
The UserPanel (floating, absolutely positioned) uses `m-2` (8px margin from the container bottom). All three chat composer wrappers use `pb-4` (16px bottom padding). This 8px difference causes the chat input to sit higher than the UserPanel.

### The Fix
Change `pb-4` to `pb-2` on the composer wrapper `div` in all three chat views, matching the UserPanel's 8px bottom margin.

| File | Line | Change |
|------|------|--------|
| `src/pages/Chat.tsx` | 777 | `px-4 pb-4 pt-2` → `px-4 pb-2 pt-2` |
| `src/pages/GroupChat.tsx` | 685 | `px-4 pb-4 pt-2` → `px-4 pb-2 pt-2` |
| `src/components/server/ServerChannelChat.tsx` | 842 | `px-4 pb-4 pt-2` → `px-4 pb-2 pt-2` |
| `src/components/server/ServerChannelChat.tsx` | 864 | `px-4 pb-4 pt-2` → `px-4 pb-2 pt-2` |

Four single-class changes across three files. No structural modifications.

