import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Camera, Shield, ShieldAlert, UserX, Crown } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import AuditLogView from "./AuditLogView";

interface Member {
  user_id: string;
  role: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    status: string;
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
}

const ServerSettingsDialog = ({ open, onOpenChange, serverId }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [serverName, setServerName] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);
  const iconInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isOwner = ownerId === user?.id;
  const isAdmin = members.find((m) => m.user_id === user?.id)?.role === "admin";
  const canViewAuditLogs = isOwner || isAdmin;

  useEffect(() => {
    if (!open || !serverId) return;
    const load = async () => {
      const { data: s } = await supabase.from("servers" as any).select("*").eq("id", serverId).maybeSingle();
      if (s) {
        setServerName((s as any).name);
        setIconUrl((s as any).icon_url || "");
        setBannerUrl((s as any).banner_url || "");
        setOwnerId((s as any).owner_id);
        setInviteCode((s as any).invite_code);
      }
      const { data: mems } = await supabase.from("server_members" as any).select("user_id, role").eq("server_id", serverId);
      if (mems) {
        const userIds = (mems as any[]).map((m) => m.user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url, status").in("user_id", userIds);
        const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
        setMembers((mems as any[]).map((m) => ({ ...m, profile: profileMap.get(m.user_id) })));
      }
    };
    load();
  }, [open, serverId]);

  const uploadImage = async (file: File, path: string) => {
    const ext = file.name.split(".").pop();
    const filePath = `${serverId}/${path}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("server-assets").upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("server-assets").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, "icon");
      setIconUrl(url);
      await supabase.from("servers" as any).update({ icon_url: url } as any).eq("id", serverId);
      toast({ title: t("profile.saved") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file, "banner");
      setBannerUrl(url);
      await supabase.from("servers" as any).update({ banner_url: url } as any).eq("id", serverId);
      toast({ title: t("profile.saved") });
    } catch {
      toast({ title: t("common.error"), variant: "destructive" });
    }
  };

  const handleSave = async () => {
    if (!serverName.trim()) return;
    setSaving(true);
    await supabase.from("servers" as any).update({ name: serverName.trim() } as any).eq("id", serverId);
    await supabase.from("server_audit_logs" as any).insert({
      server_id: serverId,
      actor_id: user?.id,
      action_type: "server_updated",
      changes: { field: "name", new_value: serverName.trim() },
    } as any);
    toast({ title: t("profile.saved") });
    setSaving(false);
  };

  const promoteToAdmin = async (userId: string) => {
    const targetProfile = members.find((m) => m.user_id === userId);
    await supabase.from("server_members" as any).update({ role: "admin" } as any).eq("server_id", serverId).eq("user_id", userId);
    await supabase.from("server_audit_logs" as any).insert({
      server_id: serverId,
      actor_id: user?.id,
      action_type: "member_promoted",
      target_id: userId,
      changes: { target_username: targetProfile?.profile?.username || userId, new_role: "admin" },
    } as any);
    setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role: "admin" } : m));
    toast({ title: t("servers.promoted") });
  };

  const demoteToMember = async (userId: string) => {
    const targetProfile = members.find((m) => m.user_id === userId);
    await supabase.from("server_members" as any).update({ role: "member" } as any).eq("server_id", serverId).eq("user_id", userId);
    await supabase.from("server_audit_logs" as any).insert({
      server_id: serverId,
      actor_id: user?.id,
      action_type: "member_demoted",
      target_id: userId,
      changes: { target_username: targetProfile?.profile?.username || userId, new_role: "member" },
    } as any);
    setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role: "member" } : m));
    toast({ title: t("servers.demoted") });
  };

  const kickMember = async (userId: string) => {
    const kickedProfile = members.find((m) => m.user_id === userId);
    await supabase.from("server_members" as any).delete().eq("server_id", serverId).eq("user_id", userId);
    await supabase.from("server_audit_logs" as any).insert({
      server_id: serverId,
      actor_id: user?.id,
      action_type: "member_kicked",
      target_id: userId,
      changes: { target_username: kickedProfile?.profile?.username || userId },
    } as any);
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    toast({ title: t("servers.kicked") });
  };

  const roleOrder = { owner: 0, admin: 1, member: 2 };
  const sortedMembers = [...members].sort((a, b) => (roleOrder[a.role as keyof typeof roleOrder] ?? 2) - (roleOrder[b.role as keyof typeof roleOrder] ?? 2));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("servers.settings")}</DialogTitle>
          <DialogDescription>{t("servers.settingsDesc")}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="general" className="flex-1">{t("servers.general")}</TabsTrigger>
            {canViewAuditLogs && (
              <TabsTrigger value="auditlogs" className="flex-1">{t("auditLog.title")}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="general">
            <div className="space-y-6 mt-4">
              {/* Banner */}
              <div className="relative">
                <div
                  className="h-28 rounded-lg bg-muted bg-cover bg-center cursor-pointer group"
                  style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : {}}
                  onClick={() => isOwner && bannerInputRef.current?.click()}
                >
                  {isOwner && (
                    <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                      <Camera className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />

                {/* Icon overlay */}
                <div className="absolute -bottom-8 start-4">
                  <div className="relative cursor-pointer group" onClick={() => isOwner && iconInputRef.current?.click()}>
                    <Avatar className="h-16 w-16 border-4 border-background">
                      <AvatarImage src={iconUrl} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xl">{serverName.charAt(0)?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    {isOwner && (
                      <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                        <Camera className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
                </div>
              </div>

              <div className="pt-6 space-y-4">
                {/* Server name */}
                <div className="space-y-2">
                  <Label>{t("servers.serverName")}</Label>
                  <div className="flex gap-2">
                    <Input value={serverName} onChange={(e) => setServerName(e.target.value)} disabled={!isOwner} />
                    {isOwner && (
                      <Button onClick={handleSave} disabled={saving || !serverName.trim()}>
                        {t("actions.save")}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Invite link info */}
                <div className="space-y-2">
                  <Label>{t("servers.inviteCode")}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t("servers.inviteLinkInfo")}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Members management */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">{t("servers.members")} — {members.length}</h3>
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {sortedMembers.map((m) => {
                    const p = m.profile;
                    const name = p?.display_name || p?.username || "User";
                    const status = p?.status || "offline";
                    const canManage = isOwner && m.user_id !== user?.id && m.role !== "owner";
                    return (
                      <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="relative">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={p?.avatar_url || ""} />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <StatusBadge status={(status === "offline" ? "invisible" : status) as UserStatus} size="sm" className="absolute bottom-0 end-0" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{name}</p>
                          <p className="text-[11px] text-muted-foreground capitalize">{t(`servers.${m.role}`)}</p>
                        </div>
                        {m.role === "owner" && <Crown className="h-4 w-4 text-primary shrink-0" />}
                        {canManage && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                                <Shield className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {m.role === "member" ? (
                                <DropdownMenuItem onClick={() => promoteToAdmin(m.user_id)}>
                                  <ShieldAlert className="h-4 w-4 me-2" />
                                  {t("servers.promoteAdmin")}
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => demoteToMember(m.user_id)}>
                                  <Shield className="h-4 w-4 me-2" />
                                  {t("servers.demoteToMember")}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-destructive" onClick={() => kickMember(m.user_id)}>
                                <UserX className="h-4 w-4 me-2" />
                                {t("servers.kick")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          {canViewAuditLogs && (
            <TabsContent value="auditlogs">
              <AuditLogView serverId={serverId} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ServerSettingsDialog;
