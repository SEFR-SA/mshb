import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useServerOwnerIsPro } from "@/hooks/useServerOwnerIsPro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ChevronLeft, Loader2, Lock, Plus, Trash2, Upload } from "lucide-react";

interface ServerRole {
  id: string;
  server_id: string;
  name: string;
  color: string;
  icon_url: string | null;
  permissions: Record<string, boolean>;
  position: number;
  created_at: string;
}

interface Props {
  serverId: string;
  canEdit: boolean;
}

const DEFAULT_PERMISSIONS: Record<string, boolean> = {
  view_channels: false,
  manage_channels: false,
  manage_roles: false,
  manage_server: false,
  create_invite: false,
  kick_members: false,
  ban_members: false,
  send_messages: false,
  attach_files: false,
  add_reactions: false,
  mention_everyone: false,
  connect: false,
  speak: false,
  video: false,
  mute_members: false,
  deafen_members: false,
};

const PERMISSION_GROUPS = [
  {
    label: "permCategoryGeneral",
    keys: ["view_channels", "manage_channels", "manage_roles", "manage_server"],
  },
  {
    label: "permCategoryMembership",
    keys: ["create_invite", "kick_members", "ban_members"],
  },
  {
    label: "permCategoryText",
    keys: ["send_messages", "attach_files", "add_reactions", "mention_everyone"],
  },
  {
    label: "permCategoryVoice",
    keys: ["connect", "speak", "video", "mute_members", "deafen_members"],
  },
];

const PRESET_COLORS = [
  "#f44336", "#e91e63", "#9c27b0", "#673ab7",
  "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4",
  "#009688", "#4caf50", "#8bc34a", "#ffeb3b",
  "#ffc107", "#ff9800", "#ff5722", "#795548",
  "#9e9e9e", "#607d8b", "#1abc9c", "#e67e22",
];

const RolesTab = ({ serverId, canEdit }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const ownerIsPro = useServerOwnerIsPro(serverId);

  const [roles, setRoles] = useState<ServerRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMobileEditor, setShowMobileEditor] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Edit state for the selected role
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#99aab5");
  const [editIconUrl, setEditIconUrl] = useState<string | null>(null);
  const [editPermissions, setEditPermissions] = useState<Record<string, boolean>>({ ...DEFAULT_PERMISSIONS });

  const iconInputRef = useRef<HTMLInputElement>(null);

  const fetchRoles = async () => {
    const { data } = await supabase
      .from("server_roles" as any)
      .select("*")
      .eq("server_id", serverId)
      .order("position");
    setRoles((data as unknown as ServerRole[]) || []);
  };

  useEffect(() => {
    if (!serverId) return;
    setLoading(true);
    fetchRoles().finally(() => setLoading(false));
  }, [serverId]);

  // Derived: the role currently saved in DB for the selected ID
  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? null;

  // Derived: dirty check
  const isDirty = !!selectedRole && (
    editName !== selectedRole.name ||
    editColor !== selectedRole.color ||
    editIconUrl !== (selectedRole.icon_url ?? null) ||
    JSON.stringify(editPermissions) !== JSON.stringify({ ...DEFAULT_PERMISSIONS, ...selectedRole.permissions })
  );

  // Load edit state when selected role changes
  const loadEditState = (role: ServerRole) => {
    setEditName(role.name);
    setEditColor(role.color);
    setEditIconUrl(role.icon_url ?? null);
    setEditPermissions({ ...DEFAULT_PERMISSIONS, ...role.permissions });
  };

  const handleSelectRole = (role: ServerRole) => {
    if (isDirty) {
      if (!window.confirm(t("serverSettings.unsavedChanges") + " — discard?")) return;
    }
    setSelectedRoleId(role.id);
    loadEditState(role);
    if (isMobile) setShowMobileEditor(true);
  };

  const handleCreateRole = async () => {
    if (!canEdit) return;
    try {
      const position = roles.length;
      const { data, error } = await supabase
        .from("server_roles" as any)
        .insert({
          server_id: serverId,
          name: "New Role",
          color: "#99aab5",
          permissions: {},
          position,
        } as any)
        .select()
        .single();
      if (error) throw error;
      const newRole = data as unknown as ServerRole;
      setRoles((prev) => [...prev, newRole]);
      setSelectedRoleId(newRole.id);
      loadEditState(newRole);
      if (isMobile) setShowMobileEditor(true);
      toast({ title: t("serverSettings.roleCreated") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!selectedRoleId || !editName.trim()) return;
    setSaving(true);
    try {
      await supabase
        .from("server_roles" as any)
        .update({
          name: editName.trim(),
          color: editColor,
          icon_url: editIconUrl,
          permissions: editPermissions,
        } as any)
        .eq("id", selectedRoleId);

      await supabase.from("server_audit_logs" as any).insert({
        server_id: serverId,
        actor_id: user?.id,
        action_type: "role_updated",
        changes: { role_name: editName.trim() },
      } as any);

      // Update local state optimistically
      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRoleId
            ? { ...r, name: editName.trim(), color: editColor, icon_url: editIconUrl, permissions: editPermissions }
            : r
        )
      );
      toast({ title: t("serverSettings.roleUpdated") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (selectedRole) loadEditState(selectedRole);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await supabase.from("server_roles" as any).delete().eq("id", deleteTargetId);

      await supabase.from("server_audit_logs" as any).insert({
        server_id: serverId,
        actor_id: user?.id,
        action_type: "role_deleted",
        changes: { role_id: deleteTargetId },
      } as any);

      setRoles((prev) => prev.filter((r) => r.id !== deleteTargetId));
      if (selectedRoleId === deleteTargetId) {
        setSelectedRoleId(null);
        if (isMobile) setShowMobileEditor(false);
      }
      toast({ title: t("serverSettings.roleDeleted") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    } finally {
      setDeleteTargetId(null);
    }
  };

  const handleIconUpload = async (file: File) => {
    try {
      const ext = file.name.split(".").pop();
      const safeName = (editName || "role").replace(/\s+/g, "_");
      const filePath = `${serverId}/role-icons/${Date.now()}_${safeName}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("server-assets")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("server-assets").getPublicUrl(filePath);
      setEditIconUrl(urlData.publicUrl);
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const handleIconRemove = () => {
    setEditIconUrl(null);
  };

  const filteredRoles = roles.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Role list pane
  const roleListPane = (
    <div
      className={cn(
        "flex flex-col border-r overflow-hidden",
        "w-full md:w-52 shrink-0",
        isMobile && showMobileEditor && "hidden md:flex"
      )}
    >
      <div className="p-3 border-b space-y-2">
        <Button
          size="sm"
          onClick={handleCreateRole}
          disabled={!canEdit}
          className="w-full"
        >
          <Plus className="h-4 w-4 me-2" />
          {t("serverSettings.createRole")}
        </Button>
        <Input
          placeholder={t("serverSettings.rolesSearchPlaceholder")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-8 text-sm"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRoles.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">
            {searchQuery ? t("serverSettings.noMembers") : t("serverSettings.noRoles")}
          </p>
        ) : (
          filteredRoles.map((role) => (
            <button
              key={role.id}
              onClick={() => handleSelectRole(role)}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm transition-colors text-start",
                selectedRoleId === role.id
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <span
                className="h-3 w-3 rounded-full shrink-0 border border-black/10"
                style={{ backgroundColor: role.color }}
              />
              <span className="truncate flex-1">{role.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );

  // Role editor pane
  const roleEditorPane = (
    <div
      className={cn(
        "flex-1 flex flex-col overflow-hidden",
        isMobile && !showMobileEditor && "hidden md:flex"
      )}
    >
      {/* Mobile back button */}
      {isMobile && showMobileEditor && (
        <div className="flex items-center gap-2 p-3 border-b shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMobileEditor(false)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("serverSettings.roles")}
          </Button>
        </div>
      )}

      {!selectedRoleId ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">{t("serverSettings.selectRolePrompt")}</p>
        </div>
      ) : (
        <>
          {/* Scrollable editor content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Delete role button */}
            {canEdit && (
              <div className="flex justify-end mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTargetId(selectedRoleId)}
                >
                  <Trash2 className="h-4 w-4 me-2" />
                  {t("serverSettings.deleteRole")}
                </Button>
              </div>
            )}

            <Tabs defaultValue="display">
              <TabsList className="mb-6">
                <TabsTrigger value="display">{t("serverSettings.tabDisplay")}</TabsTrigger>
                <TabsTrigger value="permissions">{t("serverSettings.tabPermissions")}</TabsTrigger>
              </TabsList>

              {/* Display Tab */}
              <TabsContent value="display" className="space-y-6">
                {/* Role Name */}
                <div className="space-y-2">
                  <Label>{t("serverSettings.roleName")}</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={t("serverSettings.roleNamePlaceholder")}
                    disabled={!canEdit}
                    className="max-w-sm"
                  />
                </div>

                {/* Role Color */}
                <div className="space-y-3">
                  <Label>{t("serverSettings.roleColor")}</Label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        style={{ backgroundColor: c }}
                        className={cn(
                          "h-8 w-8 rounded-full transition-transform border-2",
                          editColor === c
                            ? "border-foreground scale-110"
                            : "border-transparent hover:scale-110"
                        )}
                        onClick={() => canEdit && setEditColor(c)}
                        disabled={!canEdit}
                      />
                    ))}

                    {/* Custom color picker */}
                    <label
                      className={cn(
                        "h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center relative overflow-hidden",
                        canEdit ? "cursor-pointer hover:border-foreground" : "cursor-default opacity-50"
                      )}
                      title={t("serverSettings.roleColorCustom")}
                    >
                      <span className="text-xs text-muted-foreground leading-none">+</span>
                      <input
                        type="color"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        disabled={!canEdit}
                      />
                    </label>

                    {/* Current color swatch */}
                    <div
                      className="h-8 w-8 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: editColor }}
                    />

                    <span className="text-xs text-muted-foreground font-mono">{editColor}</span>
                  </div>
                </div>

                {/* Role Icon */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5">
                    {t("serverSettings.roleIcon")}
                    {!ownerIsPro && (
                      <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Lock className="h-2.5 w-2.5" /> PRO
                      </span>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground">{t("serverSettings.roleIconDesc")}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    {editIconUrl && (
                      <img
                        src={editIconUrl}
                        alt="role icon"
                        className="h-10 w-10 rounded object-contain border bg-muted"
                      />
                    )}
                    {canEdit && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => ownerIsPro && iconInputRef.current?.click()}
                          type="button"
                          disabled={!ownerIsPro}
                          title={!ownerIsPro ? t("pro.proRequired") : undefined}
                        >
                          <Upload className="h-4 w-4 me-2" />
                          {t("serverSettings.roleIconUpload")}
                        </Button>
                        {editIconUrl && ownerIsPro && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={handleIconRemove}
                          >
                            {t("serverSettings.roleIconRemove")}
                          </Button>
                        )}
                        <input
                          ref={iconInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/gif"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) handleIconUpload(e.target.files[0]);
                            e.target.value = "";
                          }}
                        />
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Permissions Tab */}
              <TabsContent value="permissions" className="space-y-8">
                {PERMISSION_GROUPS.map((group, groupIdx) => (
                  <div key={group.label}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                      {t(`serverSettings.${group.label}`)}
                    </h3>
                    <div className="space-y-4">
                      {group.keys.map((key) => (
                        <div key={key} className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium">{t(`serverSettings.perm_${key}`)}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {t(`serverSettings.perm_${key}_desc`)}
                            </p>
                          </div>
                          <Switch
                            checked={!!editPermissions[key]}
                            onCheckedChange={(v) =>
                              setEditPermissions((prev) => ({ ...prev, [key]: v }))
                            }
                            disabled={!canEdit}
                            className="shrink-0 mt-0.5"
                          />
                        </div>
                      ))}
                    </div>
                    {groupIdx < PERMISSION_GROUPS.length - 1 && <Separator className="mt-6" />}
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </div>

          {/* Save / Reset Banner */}
          {isDirty && (
            <div className="border-t bg-background px-6 py-3 flex items-center justify-between gap-3 shrink-0">
              <p className="text-sm text-muted-foreground">{t("serverSettings.unsavedChanges")}</p>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={handleReset} disabled={saving}>
                  {t("serverSettings.resetChanges")}
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !editName.trim()}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                  {t("serverSettings.saveChanges")}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <div className="flex h-full overflow-hidden">
        {roleListPane}
        {roleEditorPane}
      </div>

      {/* Delete Role Confirmation */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(o) => !o && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("serverSettings.deleteRoleConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("serverSettings.deleteRoleConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("serverSettings.deleteRole")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default RolesTab;
