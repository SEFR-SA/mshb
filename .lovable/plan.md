

## Remove Pin Chat Button from DM Header

The user wants to remove the "Pin Chat" toggle button (lines 466-468 in `src/pages/Chat.tsx`) from the DM chat header bar. The right-click context menu in the sidebar already provides this functionality.

### Change

**`src/pages/Chat.tsx` (lines 466-468)** — Delete the pin/unpin button:
```tsx
// Remove this:
<Button variant="ghost" size="icon" className="h-8 w-8" onClick={togglePin} title={isPinned ? t("chat.unpinChat") : t("chat.pinChat")}>
  {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
</Button>
```

Also clean up any now-unused imports (`Pin`, `PinOff`) and the `togglePin`/`isPinned` state/logic if they are no longer referenced elsewhere in the file.

