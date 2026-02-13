

## File Uploads in Chat (DM and Group) -- 10 MB Limit

### Overview
Add the ability for users to attach files of any type (images, videos, audio, documents, code files, etc.) to messages in both 1-to-1 and group chats. Files are stored in a dedicated storage bucket with a 10 MB size limit enforced client-side.

---

### 1. Database Changes

**New storage bucket: `chat-files`**
- Public bucket so files can be accessed via URL
- RLS policies allowing:
  - INSERT: authenticated users can upload to their own folder (`{userId}/...`)
  - SELECT: public (bucket is public)
  - DELETE: users can delete files in their own folder

**Add columns to `messages` table:**
- `file_url` (text, nullable) -- URL of the uploaded file
- `file_name` (text, nullable) -- original file name for display
- `file_type` (text, nullable) -- MIME type (e.g., `image/png`, `video/mp4`, `application/pdf`)
- `file_size` (integer, nullable) -- file size in bytes for display

Migration SQL:

```sql
-- Create chat-files bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true);

-- Storage RLS policies
CREATE POLICY "Auth users can upload chat files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view chat files" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'chat-files');

CREATE POLICY "Users can delete own chat files" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-files'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- Add file columns to messages
ALTER TABLE public.messages
  ADD COLUMN file_url text,
  ADD COLUMN file_name text,
  ADD COLUMN file_type text,
  ADD COLUMN file_size integer;
```

---

### 2. New Component: `FileAttachmentButton`

A reusable component placed in the message composer area (next to the text input). It:
- Renders a paperclip/attachment icon button
- Opens a native file picker (no type restriction -- accepts all files)
- Validates file size client-side (max 10 MB), shows error toast if exceeded
- Calls back with the selected file

---

### 3. New Component: `MessageFilePreview`

Renders the file attachment inside a message bubble. Behavior varies by file type:
- **Images** (`image/*`): inline thumbnail with click to open full size
- **Videos** (`video/*`): inline `<video>` player with controls
- **Audio** (`audio/*`): inline `<audio>` player with controls
- **Other files** (PDF, Word, JSON, JS, etc.): file icon + file name + size, clickable to download

---

### 4. Upload Flow

When a user selects a file:
1. Show a preview/indicator in the composer area (file name + size + remove button)
2. On send:
   a. Upload file to `chat-files/{userId}/{timestamp}_{filename}` via Supabase Storage
   b. Get the public URL
   c. Insert the message with `content` (text, can be empty), `file_url`, `file_name`, `file_type`, `file_size`
3. Clear the attachment state

---

### 5. Modify Chat Pages

**`src/pages/Chat.tsx`** (1-to-1 DM):
- Add file state (`selectedFile`) to the composer
- Add `FileAttachmentButton` next to the input
- Show file preview strip when a file is selected
- Update `sendMessage` to upload file first, then insert message with file metadata
- Update message rendering to use `MessageFilePreview` when `file_url` exists

**`src/pages/GroupChat.tsx`** (Group chat):
- Same changes as Chat.tsx

---

### 6. i18n Strings

Add to `en.ts` and `ar.ts`:

```
files: {
  tooLarge: "File is too large. Maximum size is 10 MB.",
  uploadError: "Failed to upload file.",
  download: "Download",
  attachment: "Attachment",
}
```

---

### 7. Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/...` (new) | Create bucket + add columns |
| `src/components/chat/FileAttachmentButton.tsx` | **Create** -- attachment button |
| `src/components/chat/MessageFilePreview.tsx` | **Create** -- file display in messages |
| `src/pages/Chat.tsx` | **Modify** -- add file upload to composer + render attachments |
| `src/pages/GroupChat.tsx` | **Modify** -- same as Chat.tsx |
| `src/i18n/en.ts` | **Modify** -- add file strings |
| `src/i18n/ar.ts` | **Modify** -- add Arabic file strings |

---

### 8. Constraints and Validation

- **10 MB limit** enforced client-side before upload attempt
- File name sanitized (special characters removed) before storage
- Send button disabled while file is uploading (with loading indicator)
- Messages can have text only, file only, or both text + file
- Deleted messages (`deleted_for_everyone`) will not show the file preview

