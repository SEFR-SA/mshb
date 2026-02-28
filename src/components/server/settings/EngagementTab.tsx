import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  type: string;
}

interface Props {
  serverId: string;
  canEdit: boolean;
}

const TIMEOUT_OPTIONS = [1, 5, 15, 30, 60];

const EngagementTab = ({ serverId, canEdit }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);

  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [systemChannelId, setSystemChannelId] = useState<string>("");
  const [notifLevel, setNotifLevel] = useState<string>("all_messages");
  const [inactiveChannelId, setInactiveChannelId] = useState<string>("");
  const [inactiveTimeout, setInactiveTimeout] = useState<string>("");

  useEffect(() => {
    if (!serverId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: s }, { data: ch }] = await Promise.all([
        supabase
          .from("servers" as any)
          .select("welcome_message_enabled, system_message_channel_id, default_notification_level, inactive_channel_id, inactive_timeout")
          .eq("id", serverId)
          .maybeSingle(),
        supabase
          .from("channels" as any)
          .select("id, name, type")
          .eq("server_id", serverId)
          .order("position"),
      ]);

      if (s) {
        setWelcomeEnabled(!!(s as any).welcome_message_enabled);
        setSystemChannelId((s as any).system_message_channel_id ?? "");
        setNotifLevel((s as any).default_notification_level ?? "all_messages");
        setInactiveChannelId((s as any).inactive_channel_id ?? "");
        setInactiveTimeout((s as any).inactive_timeout ? String((s as any).inactive_timeout) : "");
      }
      setChannels((ch as unknown as Channel[]) || []);
      setLoading(false);
    };
    load();
  }, [serverId]);

  // Auto-save the welcome toggle immediately — no Save button needed for this single boolean
  const handleWelcomeToggle = async (checked: boolean) => {
    const previous = welcomeEnabled;
    setWelcomeEnabled(checked);
    const { error } = await supabase
      .from("servers" as any)
      .update({ welcome_message_enabled: checked } as any)
      .eq("id", serverId);
    if (error) {
      setWelcomeEnabled(previous);
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase
        .from("servers" as any)
        .update({
          system_message_channel_id: systemChannelId || null,
          default_notification_level: notifLevel,
          inactive_channel_id: inactiveChannelId || null,
          inactive_timeout: inactiveTimeout ? parseInt(inactiveTimeout, 10) : null,
        } as any)
        .eq("id", serverId);

      await supabase.from("server_audit_logs" as any).insert({
        server_id: serverId,
        actor_id: user?.id,
        action_type: "server_updated",
        changes: { field: "engagement" },
      } as any);

      toast({ title: t("profile.saved") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">{t("serverSettings.engagement")}</h2>

      {/* Section 1 — System Messages */}
      <div className="space-y-4">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {t("serverSettings.systemMessages")}
        </p>

        {/* Welcome message toggle */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <Label className="text-sm leading-snug max-w-xs">
            {t("serverSettings.sendWelcomeMessage")}
          </Label>
          <Switch
            checked={welcomeEnabled}
            onCheckedChange={canEdit ? handleWelcomeToggle : undefined}
            disabled={!canEdit}
            className="shrink-0"
          />
        </div>

        {/* System message channel */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label className="text-sm shrink-0 sm:w-48">
            {t("serverSettings.systemMessageChannel")}
          </Label>
          <Select
            value={systemChannelId || "__none__"}
            onValueChange={(v) => setSystemChannelId(v === "__none__" ? "" : v)}
            disabled={!canEdit}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("serverSettings.noChannel")}</SelectItem>
              {textChannels.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  # {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Section 2 — Default Notifications */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t("serverSettings.defaultNotifications")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("serverSettings.defaultNotificationsDesc")}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label className="text-sm shrink-0 sm:w-48">
            {t("serverSettings.defaultNotifications")}
          </Label>
          <Select value={notifLevel} onValueChange={setNotifLevel} disabled={!canEdit}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_messages">{t("serverSettings.allMessages")}</SelectItem>
              <SelectItem value="only_mentions">{t("serverSettings.onlyMentions")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Section 3 — Inactive Channel */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t("serverSettings.inactiveChannel")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("serverSettings.inactiveChannelDesc")}
          </p>
        </div>

        {/* Inactive channel select */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label className="text-sm shrink-0 sm:w-48">
            {t("serverSettings.inactiveChannel")}
          </Label>
          <Select
            value={inactiveChannelId || "__none__"}
            onValueChange={(v) => setInactiveChannelId(v === "__none__" ? "" : v)}
            disabled={!canEdit}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("serverSettings.noChannel")}</SelectItem>
              {voiceChannels.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  🔊 {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Inactive timeout select */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label className="text-sm shrink-0 sm:w-48">
            {t("serverSettings.inactiveTimeout")}
          </Label>
          <Select
            value={inactiveTimeout || "__none__"}
            onValueChange={(v) => setInactiveTimeout(v === "__none__" ? "" : v)}
            disabled={!canEdit}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("serverSettings.noChannel")}</SelectItem>
              {TIMEOUT_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {t("serverSettings.minutesN", { n })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {canEdit && (
        <div className="pt-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
            {t("actions.save")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EngagementTab;
