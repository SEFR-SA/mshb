import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SocialPrefs {
  friendRequests: "everyone" | "friends_of_friends" | "server_members" | "nobody";
  allowDiscovery: boolean;
  dmPermissions: "everyone" | "friends" | "nobody";
}

const DEFAULT_PREFS: SocialPrefs = {
  friendRequests: "everyone",
  allowDiscovery: true,
  dmPermissions: "everyone",
};

const SocialTab = () => {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<SocialPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mshb_social_prefs");
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
    } catch {}
  }, []);

  const update = <K extends keyof SocialPrefs>(key: K, value: SocialPrefs[K]) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    localStorage.setItem("mshb_social_prefs", JSON.stringify(next));
  };

  const friendRequestOptions = [
    { value: "everyone", label: t("settings.friendRequestsEveryone") },
    { value: "friends_of_friends", label: t("settings.friendRequestsFriendsOfFriends") },
    { value: "server_members", label: t("settings.friendRequestsServerMembers") },
    { value: "nobody", label: t("settings.friendRequestsNobody") },
  ];

  const dmOptions = [
    { value: "everyone", label: t("settings.dmEveryone") },
    { value: "friends", label: t("settings.dmFriends") },
    { value: "nobody", label: t("settings.dmNobody") },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.social")}</h2>
        <p className="text-sm text-muted-foreground">Control who can interact with you.</p>
      </div>

      <div className="space-y-6">
        {/* Friend Requests */}
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("settings.friendRequests")}</h3>
          <p className="text-sm text-muted-foreground">Who can send you friend requests?</p>
          <Select value={prefs.friendRequests} onValueChange={(v) => update("friendRequests", v as SocialPrefs["friendRequests"])}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {friendRequestOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Discovery */}
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">{t("settings.allowDiscovery")}</Label>
              <p className="text-xs text-muted-foreground">Other users can search for you by username.</p>
            </div>
            <Switch
              checked={prefs.allowDiscovery}
              onCheckedChange={(v) => update("allowDiscovery", v)}
            />
          </div>
        </div>

        {/* DM Permissions */}
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("settings.dmPermissions")}</h3>
          <p className="text-sm text-muted-foreground">Who can send you direct messages?</p>
          <Select value={prefs.dmPermissions} onValueChange={(v) => update("dmPermissions", v as SocialPrefs["dmPermissions"])}>
            <SelectTrigger className="bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {dmOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default SocialTab;
