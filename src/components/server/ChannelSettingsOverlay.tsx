import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import {
  Hash, Volume2, Trash2, X, Infinity, Lock,
  Check, ShieldOff, Plus, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ServerRole { id: string; name: string; color: string; }

type EntityKind = "role" | "member";
interface SelectedEntity {
  kind: EntityKind;
  id: string;
  name: string;
  color?: string;
  avatar_url?: string;
}

interface ChannelData {
  id: string;
  name: string;
  type: string;
  is_private: boolean;
  description?: string | null;
  restricted_permissions?: string[];
  user_limit?: number;
}

interface SavePayload {
  name: string;
  description: string | null;
  is_private: boolean;
  restricted_permissions: string[];
  user_limit?: number;
}

interface Props {
  channel: ChannelData;
  serverId: string;
  serverMembers?: { id: string; name: string; username?: string; avatar_url?: string }[];
  onClose: () => void;
  onSave: (updates: SavePayload) => Promise<void>;
  onDelete: () => void;
}

type Tab = "overview" | "permissions";

// ─── Permission groups ────────────────────────────────────────────────────────

const GENERAL_CHANNEL_PERMS = ["view_channel", "manage_channel"] as const;
const TEXT_PERMS = ["send_messages", "attach_files", "mention_everyone", "delete_messages", "create_polls"] as const;
const VOICE_PERMS = ["connect", "speak", "video", "mute_members", "deafen_members"] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function ChannelSettingsOverlay({ channel, serverId, serverMembers, onClose, onSave, onDelete }: Props) {
  const { t } = useTranslation();

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [editName, setEditName] = useState(channel.name);
  const [editDesc, setEditDesc] = useState(channel.description ?? "");
  const [editPrivate, setEditPrivate] = useState(channel.is_private);
  const [editRestricted, setEditRestricted] = useState<string[]>(channel.restricted_permissions ?? []);
  const [editUserLimit, setEditUserLimit] = useState(channel.user_limit ?? 0);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(true);
  const [serverRoles, setServerRoles] = useState<ServerRole[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<SelectedEntity[]>([]);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [search, setSearch] = useState("");

  const isVoice = channel.type === "voice";

  // ── Dirty detection ───────────────────────────────────────────────────────
  const isDirty = useMemo(() => (
    editName.trim() !== channel.name ||
    editDesc !== (channel.description ?? "") ||
    editPrivate !== channel.is_private ||
    JSON.stringify([...editRestricted].sort()) !== JSON.stringify([...(channel.restricted_permissions ?? [])].sort()) ||
    editUserLimit !== (channel.user_limit ?? 0)
  ), [editName, editDesc, editPrivate, editRestricted, editUserLimit, channel]);

  // ── ESC key ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Fetch server roles ────────────────────────────────────────────────────
  useEffect(() => {
    supabase
      .from("server_roles" as any)
      .select("id, name, color")
      .eq("server_id", serverId)
      .order("position")
      .then(({ data }) => setServerRoles((data as ServerRole[]) || []));
  }, [serverId]);

  // ── Derived filtered lists for popover ────────────────────────────────────
  const selectedIds = useMemo(() => new Set(selectedEntities.map(e => e.id)), [selectedEntities]);

  const filteredRoles = useMemo(() =>
    serverRoles.filter(r =>
      !selectedIds.has(r.id) && r.name.toLowerCase().includes(search.toLowerCase())
    ), [serverRoles, selectedIds, search]);

  const filteredMembers = useMemo(() =>
    (serverMembers ?? []).filter(m =>
      !selectedIds.has(m.id) && m.name.toLowerCase().includes(search.toLowerCase())
    ), [serverMembers, selectedIds, search]);

  const addEntity = (entity: SelectedEntity) => {
    setSelectedEntities(prev => [...prev, entity]);
    setSearch("");
    setPopoverOpen(false);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    await onSave({
      name: editName.trim().toLowerCase().replace(/\s+/g, "-"),
      description: editDesc.trim() || null,
      is_private: editPrivate,
      restricted_permissions: editRestricted,
      ...(isVoice ? { user_limit: editUserLimit } : {}),
    });
    setSaving(false);
  };

  const handleReset = () => {
    setEditName(channel.name);
    setEditDesc(channel.description ?? "");
    setEditPrivate(channel.is_private);
    setEditRestricted(channel.restricted_permissions ?? []);
    setEditUserLimit(channel.user_limit ?? 0);
  };

  const toggleRestricted = (key: string, restrict: boolean) => {
    setEditRestricted(prev =>
      restrict ? [...prev.filter(k => k !== key), key] : prev.filter(k => k !== key)
    );
    // Syncing view_channel with private toggle
    if (key === "view_channel" && restrict) setEditPrivate(true);
    if (key === "view_channel" && !restrict) setEditPrivate(false);
  };

  // ── Left sidebar nav items ─────────────────────────────────────────────────
  const navItems: { id: Tab; label: string }[] = [
    { id: "overview", label: t("channels.overview", "Overview") },
    { id: "permissions", label: t("channels.permissions", "Permissions") },
  ];

  // ── Overview tab ──────────────────────────────────────────────────────────
  const renderOverview = () => (
    <div className="space-y-8 max-w-[600px]">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          {t("channels.channelName", "Channel Name")}
        </h2>
        <Input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder={t("channels.namePlaceholder")}
          className="bg-muted border-border"
          onKeyDown={(e) => e.key === "Enter" && !isDirty && handleSave()}
        />
      </div>

      {isVoice ? (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
            {t("channels.userLimit", "User Limit")}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("channels.userLimitDesc", "The maximum number of members who can join at once. 0 = no limit.")}
          </p>
          <div className="flex items-center gap-4">
            <Infinity className="h-4 w-4 text-muted-foreground shrink-0" />
            <Slider
              min={0}
              max={99}
              step={1}
              value={[editUserLimit]}
              onValueChange={([v]) => setEditUserLimit(v)}
              className="flex-1"
            />
            <span className="text-sm font-bold w-8 text-center tabular-nums">
              {editUserLimit === 0 ? "∞" : editUserLimit}
            </span>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            {t("channels.channelDescription", "Channel Description")}
          </h2>
          <Textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder={t("channels.descriptionPlaceholder", "Let members know what this channel is about.")}
            rows={6}
            className="resize-none bg-muted border-border"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            {editDesc.length}
          </p>
        </div>
      )}
    </div>
  );

  // ── Permission toggle row (X = restrict, ✓ = allow) ───────────────────────
  const PermRow = ({ permKey }: { permKey: string }) => {
    const isRestricted = editRestricted.includes(permKey);
    return (
      <div className="flex items-start justify-between gap-4 py-3 border-b border-border/40 last:border-0">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">
            {t(`serverSettings.perm_${permKey}`)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            {t(`serverSettings.perm_${permKey}_desc`)}
          </p>
        </div>
        {/* X = deny (add to restricted) | ✓ = allow (remove from restricted) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => toggleRestricted(permKey, true)}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded transition-colors",
              isRestricted
                ? "bg-red-500/20 text-red-400 ring-1 ring-red-500/50"
                : "text-muted-foreground hover:bg-muted hover:text-red-400"
            )}
            aria-label={t("serverSettings.permRolesOnlyLabel")}
            title={t("serverSettings.permRolesOnlyLabel")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => toggleRestricted(permKey, false)}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded transition-colors",
              !isRestricted
                ? "bg-green-500/20 text-green-400 ring-1 ring-green-500/50"
                : "text-muted-foreground hover:bg-muted hover:text-green-400"
            )}
            aria-label={t("serverSettings.permEveryoneLabel")}
            title={t("serverSettings.permEveryoneLabel")}
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // ── Permissions tab ───────────────────────────────────────────────────────
  const renderPermissions = () => (
    <div className="space-y-6 max-w-[700px]">
      {/* Private Channel card */}
      <div className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/40 p-4">
        <Lock className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {t("channels.privateChannelTitle", "Private Channel")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("channels.privateChannelDesc", "By making a channel private, only select members and roles will be able to view this channel.")}
          </p>
        </div>
        <Switch
          checked={editPrivate}
          onCheckedChange={(v) => {
            setEditPrivate(v);
            toggleRestricted("view_channel", v);
          }}
          className="shrink-0 mt-0.5"
        />
      </div>

      {/* Advanced permissions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setAdvancedOpen(v => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
          >
            {t("channels.advancedPermissions", "Advanced permissions")}
            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", !advancedOpen && "-rotate-90")} />
          </button>
        </div>

        {advancedOpen && <div className="flex gap-6">
          {/* Left: Roles/Members column */}
          <div className="w-52 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("channels.rolesMembersLabel", "Roles/Members")}
              </span>
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <button
                    className="h-4 w-4 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title={t("channels.addRole", "Add a role or member")}
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <Input
                    placeholder="Search roles or members..."
                    className="h-7 text-xs bg-muted border-border"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  {filteredRoles.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 pt-2 pb-1">Roles</p>
                      {filteredRoles.map(role => (
                        <button
                          key={role.id}
                          onClick={() => addEntity({ kind: "role", id: role.id, name: role.name, color: role.color })}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm text-left transition-colors"
                        >
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: role.color }} />
                          <span className="truncate">{role.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {filteredMembers.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1 pt-2 pb-1">Members</p>
                      {filteredMembers.map(m => (
                        <button
                          key={m.id}
                          onClick={() => addEntity({ kind: "member", id: m.id, name: m.name, avatar_url: m.avatar_url })}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent text-sm text-left transition-colors"
                        >
                          <div className="h-5 w-5 rounded-full bg-muted shrink-0 overflow-hidden flex items-center justify-center text-[10px] font-bold">
                            {m.avatar_url
                              ? <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                              : m.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate">{m.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {filteredRoles.length === 0 && filteredMembers.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">No results</p>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            {/* @everyone is always the base entity */}
            <button className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md bg-accent text-accent-foreground text-sm font-medium">
              {t("channels.everyone", "@everyone")}
            </button>

            {/* Selected roles/members */}
            {selectedEntities.map(entity => (
              <button
                key={entity.id}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-foreground hover:bg-accent/50 transition-colors"
              >
                {entity.kind === "role" ? (
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entity.color || "currentColor" }} />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-muted shrink-0 overflow-hidden flex items-center justify-center text-[10px] font-bold">
                    {entity.avatar_url
                      ? <img src={entity.avatar_url} alt="" className="h-full w-full object-cover" />
                      : entity.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="truncate">{entity.name}</span>
              </button>
            ))}
          </div>

          {/* Right: Permission toggles */}
          <div className="flex-1 min-w-0">
            {/* General Channel Permissions */}
            <div className="mb-6">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                {t("serverSettings.permCategoryChannelGeneral")}
              </p>
              {GENERAL_CHANNEL_PERMS.map(k => <PermRow key={k} permKey={k} />)}
            </div>

            {/* Text or Voice specific permissions */}
            {isVoice ? (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {t("serverSettings.permCategoryVoice")}
                </p>
                {VOICE_PERMS.map(k => <PermRow key={k} permKey={k} />)}
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {t("serverSettings.permCategoryText")}
                </p>
                {TEXT_PERMS.map(k => <PermRow key={k} permKey={k} />)}
              </div>
            )}
          </div>
        </div>}
      </div>
    </div>
  );

  // ── Channel type label ────────────────────────────────────────────────────
  const channelTypeLabel = isVoice
    ? t("channels.voiceChannels", "VOICE CHANNELS")
    : t("channels.textChannels", "TEXT CHANNELS");

  const ChannelIcon = isVoice ? Volume2 : Hash;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex bg-background" style={{ fontFamily: "inherit" }}>
      {/* ── Left Sidebar ───────────────────────────────────────────────────── */}
      <div className="w-[220px] shrink-0 flex flex-col items-end py-14 pr-2 bg-sidebar overflow-y-auto">
        {/* Channel header */}
        <div className="w-[180px] mb-2 px-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground truncate flex items-center gap-1">
            <ChannelIcon className="h-3 w-3 shrink-0" />
            <span className="truncate">{channel.name}</span>
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
            {channelTypeLabel}
          </p>
        </div>

        {/* Navigation tabs */}
        <div className="w-[180px] space-y-0.5">
          {navItems.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "w-full text-left px-2.5 py-1.5 rounded-md text-sm transition-colors",
                activeTab === id
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <Separator className="my-3 w-[180px]" />

        {/* Delete channel */}
        <div className="w-[180px]">
          <button
            onClick={onDelete}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            {t("channels.delete")}
            <Trash2 className="h-3.5 w-3.5 shrink-0" />
          </button>
        </div>
      </div>

      {/* ── Right Content Area ─────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-y-auto py-14 px-10 bg-background">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-14 right-8 flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity z-10"
          aria-label="Close"
        >
          <div className="h-8 w-8 rounded-full border border-border flex items-center justify-center bg-card">
            <X className="h-4 w-4" />
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">ESC</span>
        </button>

        {/* Tab heading */}
        <h1 className="text-xl font-bold mb-6">
          {activeTab === "overview"
            ? t("channels.overview", "Overview")
            : t("channels.permissions", "Permissions")}
        </h1>

        {/* Tab content */}
        {activeTab === "overview" ? renderOverview() : renderPermissions()}

        {/* Bottom padding so content clears the unsaved bar */}
        {isDirty && <div className="h-16" />}
      </div>

      {/* ── Unsaved Changes Bar ────────────────────────────────────────────── */}
      {isDirty && (
        <div className="fixed bottom-0 left-[220px] right-0 z-50 flex items-center justify-between gap-4 bg-card border-t border-border px-8 py-3 shadow-2xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldOff className="h-4 w-4 text-yellow-500 shrink-0" />
            {t("channels.unsavedChanges", "Careful — you have unsaved changes!")}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={handleReset}>
              {t("actions.reset", "Reset")}
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleSave}
              disabled={saving || !editName.trim()}
            >
              {saving
                ? t("common.saving", "Saving…")
                : t("channels.saveChanges", "Save Changes")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
