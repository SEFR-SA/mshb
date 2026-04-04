import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { Loader2, X, ShieldAlert } from "lucide-react";

interface Channel {
  id: string;
  name: string;
  type: string;
}

interface BannedWordEntry {
  id: string;
  word: string;
  action_type: "block" | "censor" | "flag";
}

interface AllowedWordEntry {
  id: string;
  word: string;
}

interface Props {
  serverId: string;
  canEdit: boolean;
}

const TIMEOUT_OPTIONS = [1, 5, 15, 30, 60];

const ACTION_COLORS: Record<string, string> = {
  block:  "bg-red-500/10 text-red-500 border-red-500/30",
  censor: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
  flag:   "bg-blue-500/10 text-blue-500 border-blue-500/30",
};

const EngagementTab = ({ serverId, canEdit }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);

  // ── Existing engagement settings ────────────────────────────────────────
  const [welcomeEnabled,     setWelcomeEnabled]     = useState(false);
  const [systemChannelId,    setSystemChannelId]    = useState<string>("");
  const [notifLevel,         setNotifLevel]         = useState<string>("all_messages");
  const [inactiveChannelId,  setInactiveChannelId]  = useState<string>("");
  const [inactiveTimeout,    setInactiveTimeout]    = useState<string>("");
  const [freeGamesChannelId, setFreeGamesChannelId] = useState<string>("");
  const [freeGamesBotEnabled, setFreeGamesBotEnabled] = useState(false);

  // ── AutoMod ─────────────────────────────────────────────────────────────
  const [automodEnabled,  setAutomodEnabled]  = useState(false);
  const [bannedWords,     setBannedWords]     = useState<BannedWordEntry[]>([]);
  const [allowedWords,    setAllowedWords]    = useState<AllowedWordEntry[]>([]);
  const [bannedInput,     setBannedInput]     = useState("");
  const [allowedInput,    setAllowedInput]    = useState("");
  const [bannedAction,    setBannedAction]    = useState<"block" | "censor" | "flag">("block");
  const [addingBanned,    setAddingBanned]    = useState(false);
  const [addingAllowed,   setAddingAllowed]   = useState(false);
  const bannedInputRef  = useRef<HTMLInputElement>(null);
  const allowedInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!serverId) return;
    const load = async () => {
      setLoading(true);
      const [{ data: s }, { data: ch }, { data: bw }, { data: aw }] =
        await Promise.all([
          supabase
            .from("servers" as any)
            .select(
              "welcome_message_enabled, system_message_channel_id, default_notification_level, inactive_channel_id, inactive_timeout, automod_enabled, free_games_channel_id, free_games_bot_enabled"
            )
            .eq("id", serverId)
            .maybeSingle(),
          supabase
            .from("channels" as any)
            .select("id, name, type")
            .eq("server_id", serverId)
            .order("position"),
          supabase
            .from("server_blocked_words" as any)
            .select("id, word, action_type")
            .eq("server_id", serverId)
            .order("created_at"),
          supabase
            .from("server_allowed_words" as any)
            .select("id, word")
            .eq("server_id", serverId)
            .order("created_at"),
        ]);

      if (s) {
        setWelcomeEnabled(!!(s as any).welcome_message_enabled);
        setSystemChannelId((s as any).system_message_channel_id ?? "");
        setNotifLevel((s as any).default_notification_level ?? "all_messages");
        setInactiveChannelId((s as any).inactive_channel_id ?? "");
        setInactiveTimeout((s as any).inactive_timeout ? String((s as any).inactive_timeout) : "");
        setAutomodEnabled(!!(s as any).automod_enabled);
        setFreeGamesChannelId((s as any).free_games_channel_id ?? "");
      }
      setChannels((ch as unknown as Channel[]) || []);
      setBannedWords((bw as unknown as BannedWordEntry[]) || []);
      setAllowedWords((aw as unknown as AllowedWordEntry[]) || []);
      setLoading(false);
    };
    load();
  }, [serverId]);

  // ── Handlers: existing settings ─────────────────────────────────────────

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
          free_games_channel_id: freeGamesChannelId || null,
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

  // ── Handlers: AutoMod ────────────────────────────────────────────────────

  const handleAutomodToggle = async (checked: boolean) => {
    const previous = automodEnabled;
    setAutomodEnabled(checked);
    const { error } = await supabase
      .from("servers" as any)
      .update({ automod_enabled: checked } as any)
      .eq("id", serverId);
    if (error) {
      setAutomodEnabled(previous);
      toast({ title: t("common.error"), variant: "destructive" });
    } else {
      await supabase.from("server_audit_logs" as any).insert({
        server_id: serverId,
        actor_id: user?.id,
        action_type: "server_updated",
        changes: { field: "automod_enabled", value: checked },
      } as any);
    }
  };

  const handleAddBannedWord = async () => {
    const word = bannedInput.trim().toLowerCase();
    if (!word) return;
    if (bannedWords.some((w) => w.word.toLowerCase() === word)) {
      toast({ title: t("automod.wordExists"), variant: "destructive" });
      return;
    }
    setAddingBanned(true);
    const { data, error } = await supabase
      .from("server_blocked_words" as any)
      .insert({ server_id: serverId, word, action_type: bannedAction, created_by: user?.id } as any)
      .select("id, word, action_type")
      .single();
    if (error) {
      toast({ title: t("common.error"), variant: "destructive" });
    } else {
      setBannedWords((prev) => [...prev, data as unknown as BannedWordEntry]);
      setBannedInput("");
      bannedInputRef.current?.focus();
    }
    setAddingBanned(false);
  };

  const handleRemoveBannedWord = async (id: string) => {
    const { error } = await supabase
      .from("server_blocked_words" as any)
      .delete()
      .eq("id", id)
      .eq("server_id", serverId);
    if (error) {
      toast({ title: t("common.error"), variant: "destructive" });
    } else {
      setBannedWords((prev) => prev.filter((w) => w.id !== id));
    }
  };

  const handleAddAllowedWord = async () => {
    const word = allowedInput.trim().toLowerCase();
    if (!word) return;
    if (allowedWords.some((w) => w.word.toLowerCase() === word)) {
      toast({ title: t("automod.wordExists"), variant: "destructive" });
      return;
    }
    setAddingAllowed(true);
    const { data, error } = await supabase
      .from("server_allowed_words" as any)
      .insert({ server_id: serverId, word, created_by: user?.id } as any)
      .select("id, word")
      .single();
    if (error) {
      toast({ title: t("common.error"), variant: "destructive" });
    } else {
      setAllowedWords((prev) => [...prev, data as unknown as AllowedWordEntry]);
      setAllowedInput("");
      allowedInputRef.current?.focus();
    }
    setAddingAllowed(false);
  };

  const handleRemoveAllowedWord = async (id: string) => {
    const { error } = await supabase
      .from("server_allowed_words" as any)
      .delete()
      .eq("id", id)
      .eq("server_id", serverId);
    if (error) {
      toast({ title: t("common.error"), variant: "destructive" });
    } else {
      setAllowedWords((prev) => prev.filter((w) => w.id !== id));
    }
  };

  const textChannels  = channels.filter((c) => c.type === "text");
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
                <SelectItem key={c.id} value={c.id}># {c.name}</SelectItem>
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
                <SelectItem key={c.id} value={c.id}>🔊 {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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

      <Separator />

      {/* Section 4 — Free Games Bot */}
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            🎮 {t("serverSettings.freeGamesBot")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("serverSettings.freeGamesBotDesc")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Label className="text-sm shrink-0 sm:w-48">
            {t("serverSettings.freeGamesChannel")}
          </Label>
          <Select
            value={freeGamesChannelId || "__none__"}
            onValueChange={(v) => setFreeGamesChannelId(v === "__none__" ? "" : v)}
            disabled={!canEdit}
          >
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("serverSettings.noChannel")}</SelectItem>
              {textChannels.map((c) => (
                <SelectItem key={c.id} value={c.id}># {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      {/* Section 5 — AutoMod ─────────────────────────────────────────────── */}
      <div className="space-y-5">
        <div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5" />
            {t("automod.sectionTitle")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("automod.sectionDesc")}
          </p>
        </div>

        {/* Master toggle */}
        <div className="flex items-start sm:items-center justify-between gap-3">
          <div>
            <Label className="text-sm">{t("automod.enableAutoMod")}</Label>
            <p className="text-xs text-muted-foreground">{t("automod.enableDesc")}</p>
          </div>
          <Switch
            checked={automodEnabled}
            onCheckedChange={canEdit ? handleAutomodToggle : undefined}
            disabled={!canEdit}
            className="shrink-0"
          />
        </div>

        {/* Custom Banned Words */}
        <div className="space-y-2">
          <div>
            <Label className="text-sm">{t("automod.bannedWords")}</Label>
            <p className="text-xs text-muted-foreground">{t("automod.bannedWordsDesc")}</p>
          </div>

          {canEdit && (
            <div className="flex gap-2">
              {/* Action type for new word */}
              <Select
                value={bannedAction}
                onValueChange={(v) => setBannedAction(v as "block" | "censor" | "flag")}
              >
                <SelectTrigger className="w-28 shrink-0 text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="block">{t("automod.actionBlock")}</SelectItem>
                  <SelectItem value="censor">{t("automod.actionCensor")}</SelectItem>
                  <SelectItem value="flag">{t("automod.actionFlag")}</SelectItem>
                </SelectContent>
              </Select>
              <Input
                ref={bannedInputRef}
                value={bannedInput}
                onChange={(e) => setBannedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddBannedWord();
                  }
                }}
                placeholder={t("automod.bannedWordsPlaceholder")}
                className="flex-1 h-9 text-sm"
                disabled={addingBanned}
              />
              <Button
                size="sm"
                onClick={handleAddBannedWord}
                disabled={addingBanned || !bannedInput.trim()}
                className="shrink-0 h-9"
              >
                {addingBanned
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : t("actions.add")}
              </Button>
            </div>
          )}

          {bannedWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {bannedWords.map((entry) => (
                <Badge
                  key={entry.id}
                  variant="outline"
                  className={`gap-1 text-xs py-0.5 ${ACTION_COLORS[entry.action_type] ?? ""}`}
                >
                  <span className="font-medium uppercase text-[9px] opacity-70">
                    {t(`automod.action${entry.action_type.charAt(0).toUpperCase()}${entry.action_type.slice(1)}`)}
                  </span>
                  {entry.word}
                  {canEdit && (
                    <button
                      onClick={() => handleRemoveBannedWord(entry.id)}
                      className="ms-0.5 hover:opacity-70 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Global Word Whitelist */}
        <div className="space-y-2">
          <div>
            <Label className="text-sm">{t("automod.allowedWords")}</Label>
            <p className="text-xs text-muted-foreground">{t("automod.allowedWordsDesc")}</p>
          </div>

          {canEdit && (
            <div className="flex gap-2">
              <Input
                ref={allowedInputRef}
                value={allowedInput}
                onChange={(e) => setAllowedInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    handleAddAllowedWord();
                  }
                }}
                placeholder={t("automod.allowedWordsPlaceholder")}
                className="flex-1 h-9 text-sm"
                disabled={addingAllowed}
              />
              <Button
                size="sm"
                onClick={handleAddAllowedWord}
                disabled={addingAllowed || !allowedInput.trim()}
                className="shrink-0 h-9"
              >
                {addingAllowed
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : t("actions.add")}
              </Button>
            </div>
          )}

          {allowedWords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {allowedWords.map((entry) => (
                <Badge
                  key={entry.id}
                  variant="outline"
                  className="gap-1 text-xs py-0.5 bg-green-500/10 text-green-500 border-green-500/30"
                >
                  {entry.word}
                  {canEdit && (
                    <button
                      onClick={() => handleRemoveAllowedWord(entry.id)}
                      className="ms-0.5 hover:opacity-70 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EngagementTab;
