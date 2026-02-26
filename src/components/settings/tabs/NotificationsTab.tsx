import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

interface NotifPrefs {
  desktopEnabled: boolean;
  messageSound: boolean;
  callSound: boolean;
  mentionSound: boolean;
  showBadge: boolean;
  showTabCount: boolean;
  emailMissed: boolean;
  emailFriendRequests: boolean;
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

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}

const ToggleRow = ({ label, description, checked, onCheckedChange }: ToggleRowProps) => (
  <div className="flex items-center justify-between py-3">
    <div className="space-y-0.5">
      <Label className="text-sm font-medium cursor-pointer">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onCheckedChange} />
  </div>
);

const NotificationsTab = () => {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mshb_notification_prefs");
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const update = <K extends keyof NotifPrefs>(key: K, value: NotifPrefs[K]) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem("mshb_notification_prefs", JSON.stringify(next));
  };

  const handleDesktopToggle = async (enabled: boolean) => {
    if (enabled && Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast({ title: "Permission denied", description: "Allow notifications in your browser settings.", variant: "destructive" });
        return;
      }
    }
    update("desktopEnabled", enabled);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.notifications")}</h2>
        <p className="text-sm text-muted-foreground">Control how and when you receive notifications.</p>
      </div>

      {/* Desktop Notifications */}
      <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-1 divide-y divide-border/30">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground pb-2">{t("settings.desktopNotifications")}</h3>
        <ToggleRow
          label={t("settings.enableDesktopNotifications")}
          description="Show system notifications when you receive messages."
          checked={prefs.desktopEnabled}
          onCheckedChange={handleDesktopToggle}
        />
      </div>

      {/* Sounds */}
      <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-1 divide-y divide-border/30">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground pb-2">{t("settings.sounds")}</h3>
        <ToggleRow
          label={t("settings.messageSound")}
          checked={prefs.messageSound}
          onCheckedChange={(v) => update("messageSound", v)}
        />
        <ToggleRow
          label={t("settings.callSound")}
          checked={prefs.callSound}
          onCheckedChange={(v) => update("callSound", v)}
        />
        <ToggleRow
          label={t("settings.mentionSound")}
          checked={prefs.mentionSound}
          onCheckedChange={(v) => update("mentionSound", v)}
        />
      </div>

      {/* Badges */}
      <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-1 divide-y divide-border/30">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground pb-2">{t("settings.badges")}</h3>
        <ToggleRow
          label={t("settings.showBadge")}
          description="Show a red dot or count on app icon."
          checked={prefs.showBadge}
          onCheckedChange={(v) => update("showBadge", v)}
        />
        <ToggleRow
          label={t("settings.showTabCount")}
          description="Display unread count in browser tab title."
          checked={prefs.showTabCount}
          onCheckedChange={(v) => update("showTabCount", v)}
        />
      </div>

      {/* Email */}
      <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-1 divide-y divide-border/30">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground pb-2">{t("settings.emailNotifications")}</h3>
        <ToggleRow
          label={t("settings.emailMissed")}
          checked={prefs.emailMissed}
          onCheckedChange={(v) => update("emailMissed", v)}
        />
        <ToggleRow
          label={t("settings.emailFriendRequests")}
          checked={prefs.emailFriendRequests}
          onCheckedChange={(v) => update("emailFriendRequests", v)}
        />
      </div>
    </div>
  );
};

export default NotificationsTab;
