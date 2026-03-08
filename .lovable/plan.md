

## Plan: Remove Email Notifications Section

Remove the entire "Email Notifications" section (the card with "Coming Soon" badge, `emailMissed` and `emailFriendRequests` toggles) from `src/components/settings/tabs/NotificationsTab.tsx`.

Also clean up the `emailMissed` and `emailFriendRequests` fields from the `NotifPrefs` interface in both `NotificationsTab.tsx` and `src/lib/notificationPrefs.ts`.

### Files Changed

| File | Change |
|------|--------|
| `src/components/settings/tabs/NotificationsTab.tsx` | Delete the email section (~lines 115-130), remove `emailMissed`/`emailFriendRequests` from local interface and defaults |
| `src/lib/notificationPrefs.ts` | Remove `emailMissed`/`emailFriendRequests` from `NotifPrefs` interface and `DEFAULT_PREFS` |

