import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { Crown, Menu, Shield, ShieldAlert, UserX, Trash2, User, Tag, Sparkles, Smile, StickerIcon, Volume2, Users, ShieldCheck, ScrollText } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import { cn } from "@/lib/utils";
import AuditLogView from "./AuditLogView";
import ServerProfileTab from "./settings/ServerProfileTab";
import EngagementTab from "./settings/EngagementTab";
import ServerTagTab from "./settings/ServerTagTab";
import EmojisTab from "./settings/EmojisTab";
import StickersTab from "./settings/StickersTab";
import SoundboardTab from "./settings/SoundboardTab";

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

type TabId = "profile" | "tag" | "engagement" | "emojis" | "stickers" | "soundboard" | "members" | "roles" | "auditlogs";

const ServerSettingsDialog = ({ open, onOpenChange, serverId }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [serverName, setServerName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const isOwner = ownerId === user?.id;
  const isAdmin = members.find((m) => m.user_id === user?.id)?.role === "admin";
  const canEdit = isOwner || isAdmin;
  const canViewAuditLogs = isOwner || isAdmin;

  useEffect(() => {
    if (!open || !serverId) return;
    const load = async () => {
      const { data: s } = await supabase.from("servers" as any).select("*").eq("id", serverId).maybeSingle();
      if (s) {
        setServerName((s as any).name);
        setDescription((s as any).description || "");
        setIconUrl((s as any).icon_url || "");
        setBannerUrl((s as any).banner_url || "");
        setOwnerId((s as any).owner_id);
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

  const promoteToAdmin = async (userId: string) => {
    const targetProfile = members.find((m) => m.user_id === userId);
    await supabase.from("server_members" as any).update({ role: "admin" } as any).eq("server_id", serverId).eq("user_id", userId);
    await supabase.from("server_audit_logs" as any).insert({
      server_id: serverId, actor_id: user?.id, action_type: "member_promoted", target_id: userId,
      changes: { target_username: targetProfile?.profile?.username || userId, new_role: "admin" },
    } as any);
    setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role: "admin" } : m));
    toast({ title: t("servers.promoted") });
  };

  const demoteToMember = async (userId: string) => {
    const targetProfile = members.find((m) => m.user_id === userId);
    await supabase.from("server_members" as any).update({ role: "member" } as any).eq("server_id", serverId).eq("user_id", userId);
    await supabase.from("server_audit_logs" as any).insert({
      server_id: serverId, actor_id: user?.id, action_type: "member_demoted", target_id: userId,
      changes: { target_username: targetProfile?.profile?.username || userId, new_role: "member" },
    } as any);
    setMembers((prev) => prev.map((m) => m.user_id === userId ? { ...m, role: "member" } : m));
    toast({ title: t("servers.demoted") });
  };

  const kickMember = async (userId: string) => {
    const kickedProfile = members.find((m) => m.user_id === userId);
    await supabase.from("server_members" as any).delete().eq("server_id", serverId).eq("user_id", userId);
    await supabase.from("server_audit_logs" as any).insert({
      server_id: serverId, actor_id: user?.id, action_type: "member_kicked", target_id: userId,
      changes: { target_username: kickedProfile?.profile?.username || userId },
    } as any);
    setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    toast({ title: t("servers.kicked") });
  };

  const handleDeleteServer = async () => {
    if (deleteInput !== serverName) return;
    // Delete channels, members, then server
    await supabase.from("channels" as any).delete().eq("server_id", serverId);
    await supabase.from("server_members" as any).delete().eq("server_id", serverId);
    await supabase.from("servers" as any).delete().eq("id", serverId);
    toast({ title: t("servers.serverDeleted") });
    setShowDeleteConfirm(false);
    onOpenChange(false);
    navigate("/");
  };

  const roleOrder = { owner: 0, admin: 1, member: 2 };
  const sortedMembers = [...members].sort((a, b) => (roleOrder[a.role as keyof typeof roleOrder] ?? 2) - (roleOrder[b.role as keyof typeof roleOrder] ?? 2));

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: t("serverSettings.serverProfile"), icon: <User className="h-4 w-4" /> },
    { id: "tag", label: t("serverSettings.serverTag"), icon: <Tag className="h-4 w-4" /> },
    { id: "engagement", label: t("serverSettings.engagement"), icon: <Sparkles className="h-4 w-4" /> },
    { id: "emojis", label: t("serverSettings.emojis"), icon: <Smile className="h-4 w-4" /> },
    { id: "stickers", label: t("serverSettings.stickers"), icon: <StickerIcon className="h-4 w-4" /> },
    { id: "soundboard", label: t("serverSettings.soundboard"), icon: <Volume2 className="h-4 w-4" /> },
    { id: "members", label: t("serverSettings.members"), icon: <Users className="h-4 w-4" /> },
    { id: "roles", label: t("serverSettings.roles"), icon: <ShieldCheck className="h-4 w-4" /> },
  ];

  const handleTabClick = (id: TabId) => {
    setActiveTab(id);
    if (isMobile) setMobileSheetOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors text-start",
              activeTab === tab.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        {canViewAuditLogs && (
          <>
            <Separator className="my-2" />
            <button
              onClick={() => handleTabClick("auditlogs")}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors text-start",
                activeTab === "auditlogs" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <ScrollText className="h-4 w-4" />
              {t("auditLog.title")}
            </button>
          </>
        )}

        {isOwner && (
          <>
            <Separator className="my-2" />
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors text-start"
            >
              <Trash2 className="h-4 w-4" />
              {t("serverSettings.deleteServer")}
            </button>
          </>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "profile":
        return (
          <ServerProfileTab
            serverId={serverId}
            serverName={serverName}
            setServerName={setServerName}
            description={description}
            setDescription={setDescription}
            iconUrl={iconUrl}
            setIconUrl={setIconUrl}
            bannerUrl={bannerUrl}
            setBannerUrl={setBannerUrl}
            canEdit={canEdit}
            userId={user?.id}
          />
        );
      case "members":
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t("serverSettings.members")} — {members.length}</h2>
            <div className="space-y-1">
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
        );
      case "engagement":
        return <EngagementTab serverId={serverId} canEdit={canEdit} />;
      case "tag":
        return <ServerTagTab serverId={serverId} canEdit={canEdit} />;
      case "emojis":
        return <EmojisTab serverId={serverId} canEdit={canEdit} />;
      case "stickers":
        return <StickersTab serverId={serverId} canEdit={canEdit} />;
      case "soundboard":
        return <SoundboardTab serverId={serverId} canEdit={canEdit} />;
      case "auditlogs":
        return canViewAuditLogs ? <AuditLogView serverId={serverId} /> : null;
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">{t("serverSettings.comingSoon")}</p>
          </div>
        );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl h-[85vh] p-0 gap-0 flex flex-col">
          <DialogHeader className="sr-only">
            <DialogTitle>{t("servers.settings")}</DialogTitle>
            <DialogDescription>{t("servers.settingsDesc")}</DialogDescription>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Desktop sidebar */}
            {!isMobile && (
              <aside className="w-56 border-e bg-muted/30 shrink-0 overflow-y-auto">
                {sidebarContent}
              </aside>
            )}

            {/* Content area */}
            <div className="flex-1 overflow-y-auto">
              {/* Mobile header */}
              {isMobile && (
                <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b bg-background">
                  <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-64 p-0">
                      {sidebarContent}
                    </SheetContent>
                  </Sheet>
                  <h2 className="text-sm font-semibold">{t("servers.settings")}</h2>
                </div>
              )}

              <div className="p-6">{renderContent()}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Server Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("serverSettings.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("serverSettings.deleteConfirmDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <p className="text-sm text-muted-foreground">{t("serverSettings.typeServerName")}</p>
            <Input value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} placeholder={serverName} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteInput("")}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteServer}
              disabled={deleteInput !== serverName}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("serverSettings.deleteServer")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ServerSettingsDialog;
