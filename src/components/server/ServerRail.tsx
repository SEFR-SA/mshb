import React, { useEffect, useState } from "react";
import { ServerRailSkeleton } from "@/components/skeletons/SkeletonLoaders";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, LogIn, MessageSquare, Users, Settings, Copy, LogOut, Trash2, Monitor, Volume2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CreateServerDialog from "./CreateServerDialog";
import JoinServerDialog from "./JoinServerDialog";
import ServerSettingsDialog from "./ServerSettingsDialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useServerUnread } from "@/hooks/useServerUnread";
import { useServerVoiceActivity } from "@/hooks/useServerVoiceActivity";

interface Server {
  id: string;
  name: string;
  icon_url: string | null;
  owner_id: string;
  invite_code: string;
}

interface ServerRailProps {
  onNavigate?: () => void;
}

const ServerRail = ({ onNavigate }: ServerRailProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [servers, setServers] = useState<Server[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [settingsServerId, setSettingsServerId] = useState<string | null>(null);
  const [deleteServerId, setDeleteServerId] = useState<string | null>(null);

  const serverIds = servers.map((s) => s.id);
  const unreadMap = useServerUnread(serverIds);
  const voiceActivityMap = useServerVoiceActivity(serverIds);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: memberships } = await supabase
        .from("server_members" as any)
        .select("server_id")
        .eq("user_id", user.id);
      if (!memberships || memberships.length === 0) { setServers([]); setLoading(false); return; }
      const ids = memberships.map((m: any) => m.server_id);
      const { data } = await supabase
        .from("servers" as any)
        .select("id, name, icon_url, owner_id, invite_code")
        .in("id", ids);
      setServers((data as any) || []);
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("server-members-rail")
      .on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user]);

  const handleCopyInvite = (inviteCode: string) => {
    navigator.clipboard.writeText(inviteCode);
    toast({ title: t("servers.copiedInvite") });
  };

  const handleLeaveServer = async (serverId: string) => {
    if (!user) return;
    await supabase.from("server_members" as any).delete().eq("server_id", serverId).eq("user_id", user.id);
    setServers((prev) => prev.filter((s) => s.id !== serverId));
    navigate("/");
  };

  const handleDeleteServer = async () => {
    if (!deleteServerId) return;
    await supabase.from("servers" as any).delete().eq("id", deleteServerId);
    setServers((prev) => prev.filter((s) => s.id !== deleteServerId));
    setDeleteServerId(null);
    toast({ title: t("servers.serverDeleted") });
    navigate("/");
  };

  return (
    <>
      <div className="w-[72px] flex flex-col items-center py-3 gap-2 bg-sidebar-background/60 backdrop-blur-sm border-e border-sidebar-border shrink-0 overflow-y-auto">
        {/* Home button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { navigate("/"); onNavigate?.(); }}
              className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all hover:rounded-xl ${
                location.pathname === "/"
                  ? "bg-primary text-primary-foreground rounded-xl"
                  : "bg-sidebar-accent/60 text-sidebar-foreground hover:bg-primary/20 hover:text-primary"
              }`}
            >
              <MessageSquare className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("nav.inbox")}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { navigate("/friends"); onNavigate?.(); }}
              className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all hover:rounded-xl ${
                location.pathname === "/friends"
                  ? "bg-primary text-primary-foreground rounded-xl"
                  : "bg-sidebar-accent/60 text-sidebar-foreground hover:bg-primary/20 hover:text-primary"
              }`}
            >
              <Users className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("nav.friends")}</TooltipContent>
        </Tooltip>

        <Separator className="w-8 mx-auto" />

        {/* Server icons with context menu */}
        {loading ? (
          <ServerRailSkeleton count={3} />
        ) : (
          <div className="contents animate-fade-in">
            {servers.map((s) => {
              const hasUnread = unreadMap.get(s.id) || false;
              const voiceActivity = voiceActivityMap.get(s.id);

              return (
                <ContextMenu key={s.id}>
                  <Tooltip>
                    <ContextMenuTrigger asChild>
                      <TooltipTrigger asChild>
                        <div className="relative">
                          {hasUnread && (
                            <div className="absolute -start-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10" />
                          )}
                          <NavLink
                            to={`/server/${s.id}`}
                            onClick={() => onNavigate?.()}
                            className={({ isActive }) =>
                              `flex items-center justify-center w-12 h-12 rounded-2xl transition-all hover:rounded-xl ${
                                isActive ? "bg-primary text-primary-foreground rounded-xl" : "bg-sidebar-accent/60 text-sidebar-foreground hover:bg-primary/20"
                              }`
                            }
                          >
                            <Avatar className="h-12 w-12 rounded-[inherit]">
                              <AvatarImage src={s.icon_url || ""} />
                              <AvatarFallback className="bg-transparent text-inherit text-sm font-bold rounded-[inherit]">
                                {s.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          </NavLink>
                          {voiceActivity?.hasVoice && (
                            <div className="absolute -bottom-0.5 -end-0.5 bg-green-500 rounded-full p-0.5 z-10">
                              {voiceActivity.hasScreenShare ? (
                                <Monitor className="h-2.5 w-2.5 text-white" />
                              ) : (
                                <Volume2 className="h-2.5 w-2.5 text-white" />
                              )}
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                    </ContextMenuTrigger>
                    <TooltipContent side="right">{s.name}</TooltipContent>
                  </Tooltip>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => setSettingsServerId(s.id)}>
                      <Settings className="h-4 w-4 me-2" />
                      {t("servers.settings")}
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleCopyInvite(s.invite_code)}>
                      <Copy className="h-4 w-4 me-2" />
                      {t("servers.copyInvite")}
                    </ContextMenuItem>
                    {user && s.owner_id !== user.id && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => handleLeaveServer(s.id)}>
                          <LogOut className="h-4 w-4 me-2" />
                          {t("servers.leave")}
                        </ContextMenuItem>
                      </>
                    )}
                    {user && s.owner_id === user.id && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteServerId(s.id)}>
                          <Trash2 className="h-4 w-4 me-2" />
                          {t("servers.deleteServer")}
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              );
            })}
          </div>
        )}

        <Separator className="w-8 mx-auto" />

        {/* Create server */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setCreateOpen(true)}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-sidebar-accent/60 text-sidebar-foreground hover:bg-primary/20 hover:text-primary hover:rounded-xl transition-all"
            >
              <Plus className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("servers.create")}</TooltipContent>
        </Tooltip>

        {/* Join server */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setJoinOpen(true)}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-sidebar-accent/60 text-sidebar-foreground hover:bg-primary/20 hover:text-primary hover:rounded-xl transition-all"
            >
              <LogIn className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{t("servers.joinServer")}</TooltipContent>
        </Tooltip>
      </div>

      <CreateServerDialog open={createOpen} onOpenChange={setCreateOpen} />
      <JoinServerDialog open={joinOpen} onOpenChange={setJoinOpen} />
      {settingsServerId && (
        <ServerSettingsDialog
          serverId={settingsServerId}
          open={!!settingsServerId}
          onOpenChange={(open) => { if (!open) setSettingsServerId(null); }}
        />
      )}
      <Dialog open={!!deleteServerId} onOpenChange={(open) => { if (!open) setDeleteServerId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("servers.deleteServer")}</DialogTitle>
            <DialogDescription>{t("servers.deleteServerConfirm")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteServerId(null)}>{t("common.cancel")}</Button>
            <Button variant="destructive" onClick={handleDeleteServer}>{t("servers.deleteServer")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ServerRail;
