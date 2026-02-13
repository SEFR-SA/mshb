

# Notification Sound/Toast + Friendly Username Error

## Overview
Three changes: (1) Play a notification sound and show a toast when a new message arrives, (2) Play a sound and show a toast when a new friend request arrives, (3) Replace the raw database error for duplicate usernames with a friendly "Username is already taken" message.

---

## 1. Notification Sound for New Messages

### `src/hooks/useUnreadCount.ts`
- Import `toast` from `@/hooks/use-toast`
- Track the previous unread count using a ref
- When the new total exceeds the previous total (meaning a new message arrived), play a notification sound and show a toast: "New message received"
- Create and play an `Audio` object with a short notification sound (use a small embedded base64 sound or a public URL)
- Skip notifications if the document is focused on the chat page (optional, but nice to have)

### `public/notification.mp3`
- Add a small notification sound file to the public folder (a short pleasant chime)

---

## 2. Notification Sound for Friend Requests

### `src/hooks/usePendingFriendRequests.ts`
- Import `toast` from `@/hooks/use-toast`
- Track previous pending count with a ref
- When the new count exceeds the previous count, play the same notification sound and show a toast: "New friend request!"
- Only trigger on increases (not when requests are accepted/rejected, which decreases the count)

---

## 3. Friendly Username Error in Settings

### `src/pages/Settings.tsx`
- In the `handleSave` function (line 75-76), check if the error message contains "unique constraint" or "profiles_username_unique"
- If so, show the friendly message from i18n: `t("auth.usernameTaken")` instead of the raw database error
- The key `auth.usernameTaken` already exists in translations ("Username is already taken")

---

## i18n Updates

### `src/i18n/en.ts`
- Add `notifications.newMessage`: "You have a new message"
- Add `notifications.newFriendRequest`: "You have a new friend request!"

### `src/i18n/ar.ts`
- Add Arabic translations for the above keys

---

## Technical Details

### Files Created
- `public/notification.mp3` -- short notification chime sound

### Files Modified
- `src/hooks/useUnreadCount.ts` -- detect increases in unread count, play sound + show toast
- `src/hooks/usePendingFriendRequests.ts` -- detect new friend requests, play sound + show toast
- `src/pages/Settings.tsx` -- catch duplicate username error and show friendly message
- `src/i18n/en.ts` -- add notification translation keys
- `src/i18n/ar.ts` -- add Arabic notification translations

