export interface NotifPrefs {
  desktopEnabled: boolean;
  messageSound: boolean;
  callSound: boolean;
  mentionSound: boolean;
  showBadge: boolean;
  showTabCount: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  desktopEnabled: false,
  messageSound: true,
  callSound: true,
  mentionSound: true,
  showBadge: true,
  showTabCount: true,
  emailMissed: false,
  emailFriendRequests: false,
};

export function getNotificationPrefs(): NotifPrefs {
  try {
    const stored = localStorage.getItem("mshb_notification_prefs");
    if (stored) return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {}
  return { ...DEFAULT_PREFS };
}
