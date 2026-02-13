

## Plan: Fix Group Leave Bug + Upload Progress Indicator + Drag-and-Drop Files

### 1. Fix: Group Leave Not Working

**Problem**: In `GroupSettingsDialog.tsx`, the `handleLeave` function navigates to the messages page regardless of whether the database delete succeeded. If the delete fails (silently), the user gets redirected but remains a group member.

**Fix**: Add error handling to `handleLeave` -- only close the dialog and navigate if the delete succeeds. Show an error toast if it fails.

**File**: `src/components/GroupSettingsDialog.tsx`
- Wrap the delete call in error checking
- Only call `onLeave()` if delete was successful
- Show error toast on failure

```
const handleLeave = async () => {
  if (!user) return;
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", user.id);
  if (error) {
    toast({ title: t("common.error"), variant: "destructive" });
    return;
  }
  onOpenChange(false);
  onLeave();
};
```

---

### 2. Add Upload Progress Indicator

**Problem**: When uploading files in chat, there is no visual feedback -- the user doesn't know if the upload is in progress.

**Solution**: Show a progress bar in the composer area while a file is uploading.

**Changes**:

- **`src/lib/uploadChatFile.ts`**: Modify to use `XMLHttpRequest` instead of the Supabase SDK so we can track upload progress via `xhr.upload.onprogress`. Return both the URL and accept an `onProgress` callback.

- **`src/pages/Chat.tsx`** and **`src/pages/GroupChat.tsx`**:
  - Add `uploadProgress` state (0-100, or null when not uploading)
  - Pass `onProgress` callback to `uploadChatFile`
  - Render a `Progress` bar component above the composer when uploading
  - Disable the input and send button during upload

- **`src/i18n/en.ts`** and **`src/i18n/ar.ts`**: Add `files.uploading` string ("Uploading file...")

---

### 3. Add Drag-and-Drop File Upload

**Problem**: Users can only attach files by clicking the paperclip button.

**Solution**: Allow dragging files onto the chat message area to attach them.

**Changes**:

- **`src/pages/Chat.tsx`** and **`src/pages/GroupChat.tsx`**:
  - Add `dragOver` state to track when a file is being dragged over the chat area
  - Add `onDragOver`, `onDragLeave`, and `onDrop` handlers to the chat panel wrapper
  - On drop, validate file size (10 MB limit) and set as `selectedFile`
  - Show a visual overlay ("Drop file here") when dragging over the area

- **`src/i18n/en.ts`** and **`src/i18n/ar.ts`**: Add `files.dropHere` string ("Drop file here")

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/GroupSettingsDialog.tsx` | Fix handleLeave error handling |
| `src/lib/uploadChatFile.ts` | Add progress callback support via XHR |
| `src/pages/Chat.tsx` | Upload progress bar + drag-and-drop |
| `src/pages/GroupChat.tsx` | Upload progress bar + drag-and-drop |
| `src/i18n/en.ts` | Add uploading and dropHere strings |
| `src/i18n/ar.ts` | Add Arabic translations |

