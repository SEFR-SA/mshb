import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { Menu, Trash2, User, Tag, Sparkles, Smile, StickerIcon, Volume2, Users, ShieldCheck, ScrollText, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import AuditLogView from "./AuditLogView";
import ServerProfileTab from "./settings/ServerProfileTab";
import EngagementTab from "./settings/EngagementTab";
import ServerTagTab from "./settings/ServerTagTab";
import EmojisTab from "./settings/EmojisTab";
import StickersTab from "./settings/StickersTab";
import SoundboardTab from "./settings/SoundboardTab";
import MembersTab from "./settings/MembersTab";
import RolesTab from "./settings/RolesTab";
import ServerBoostsTab from "./settings/ServerBoostsTab";

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
  initialTab?: TabId;
}

export type TabId = "profile" | "tag" | "engagement" | "emojis" | "stickers" | "soundboard" | "members" | "roles" | "serverBoosts" | "auditlogs";

const ServerSettingsDialog = ({ open, onOpenChange, serverId, initialTab }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const isElectron = typeof window !== "undefined" && !!(window as any).electronAPI;

  const [activeTab, setActiveTab] = useState<TabId>(initialTab ?? "profile");
  const [serverName, setServerName] = useState("");
  const [description, setDescription] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [boostLevel, setBoostLevel] = useState(0);
  const [members, setMembers] = useState<Member[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  const isOwner = ownerId === user?.id;
  const isAdmin = members.find((m) => m.user_id === user?.id)?.role === "admin";
  const canEdit = isOwner || isAdmin;
  const canViewAuditLogs = isOwner || isAdmin;

  const loadServerData = async () => {
    if (!serverId) return;
    const { data: s } = await supabase.from("servers" as any).select("*").eq("id", serverId).maybeSingle();
    if (s) {
      setServerName((s as any).name);
      setDescription((s as any).description || "");
      setIconUrl((s as any).icon_url || "");
      setBannerUrl((s as any).banner_url || "");
      setOwnerId((s as any).owner_id);
      setBoostLevel((s as any).boost_level ?? 0);
    }
    const { data: mems } = await supabase.from("server_members" as any).select("user_id, role").eq("server_id", serverId);
    if (mems) {
      const userIds = (mems as any[]).map((m) => m.user_id);
      const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, username, avatar_url, status").in("user_id", userIds);
      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      setMembers((mems as any[]).map((m) => ({ ...m, profile: profileMap.get(m.user_id) })));
    }
  };

  useEffect(() => {
    if (!open || !serverId) return;
    loadServerData();

    const channel = supabase
      .channel(`settings-server-rt-${serverId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "servers", filter: `id=eq.${serverId}` }, () => loadServerData())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [open, serverId]);

  useEffect(() => {
    if (open) setActiveTab(initialTab ?? "profile");
  }, [open, initialTab]);

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

        {canEdit && (
          <>
            <Separator className="my-2" />
            <button
              onClick={() => handleTabClick("serverBoosts")}
              className={cn(
                "flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium transition-colors text-start",
                activeTab === "serverBoosts" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Zap className="h-4 w-4" />
              {t("serverBoost.serverBoostStatus")}
            </button>
          </>
        )}

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
            boostLevel={boostLevel}
          />
        );
      case "members":
        return <MembersTab serverId={serverId} canEdit={canEdit} />;
      case "engagement":
        return <EngagementTab serverId={serverId} canEdit={canEdit} />;
      case "tag":
        return <ServerTagTab serverId={serverId} canEdit={canEdit} />;
      case "emojis":
        return <EmojisTab serverId={serverId} canEdit={canEdit} boostLevel={boostLevel} />;
      case "stickers":
        return <StickersTab serverId={serverId} canEdit={canEdit} boostLevel={boostLevel} />;
      case "soundboard":
        return <SoundboardTab serverId={serverId} canEdit={canEdit} />;
      case "roles":
        return <RolesTab serverId={serverId} canEdit={canEdit} />;
      case "serverBoosts":
        return canEdit ? <ServerBoostsTab serverId={serverId} /> : null;
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

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  if (!open) return (
    <>
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

  return (
    <>
      <div className={`fixed inset-0 z-50 flex bg-background animate-in fade-in duration-200${isElectron ? " pt-8" : ""}`}>
        <div className="flex w-full h-full overflow-hidden">
          {/* Desktop sidebar */}
          {!isMobile && (
            <aside className="w-64 hidden md:flex shrink-0 flex-col overflow-hidden bg-background text-sidebar-foreground border-e border-border/50">
              {sidebarContent}
            </aside>
          )}

          {/* Content area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-muted relative min-h-[100dvh] sm:min-h-0">
            {/* Discord-style Close Button */}
            <button
              onClick={() => onOpenChange(false)}
              className="absolute top-4 end-4 sm:top-8 sm:end-8 z-20 flex flex-col items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Close settings"
            >
              <X className="h-5 w-5 text-muted-foreground" />
              <span className="text-[10px] font-bold text-muted-foreground hidden sm:block">ESC</span>
            </button>

            {/* Mobile header */}
            {isMobile && (
              <div className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b bg-muted shrink-0">
                <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-64 p-0 bg-background text-sidebar-foreground flex flex-col">
                    {sidebarContent}
                  </SheetContent>
                </Sheet>
                <h2 className="text-sm font-semibold">{t("servers.settings")}</h2>
              </div>
            )}

            {activeTab === "roles" ? (
              <div className="flex-1 overflow-hidden">{renderContent()}</div>
            ) : (
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-10">
                  {renderContent()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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
