import React, { useEffect, useState, useCallback } from "react";
import { ServerRailSkeleton } from "@/components/skeletons/SkeletonLoaders";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, LogIn, MessageSquare, Users, Settings, Copy, LogOut, Trash2, Monitor, Volume2 } from "lucide-react";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from "@/components/ui/context-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CreateServerDialog from "./CreateServerDialog";
import JoinServerDialog from "./JoinServerDialog";
import ServerSettingsDialog from "./ServerSettingsDialog";
import ServerFolderDialog from "./ServerFolderDialog";
import ServerFolder from "./ServerFolder";
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

interface Folder {
  id: string;
  name: string;
  color: string;
  position: number;
  serverIds: string[];
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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [settingsServerId, setSettingsServerId] = useState<string | null>(null);
  const [deleteServerId, setDeleteServerId] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [pendingFolderServers, setPendingFolderServers] = useState<string[] | null>(null);
  const [draggedServerId, setDraggedServerId] = useState<string | null>(null);

  const serverIds = servers.map((s) => s.id);
  const unreadMap = useServerUnread(serverIds);
  const voiceActivityMap = useServerVoiceActivity(serverIds);

  // IDs of servers that are inside folders
  const folderedServerIds = new Set(folders.flatMap((f) => f.serverIds));

  // Loose servers (not in any folder)
  const looseServers = servers.filter((s) => !folderedServerIds.has(s.id));

  const loadData = useCallback(async () => {
    if (!user) return;
    // Load servers
    const { data: memberships } = await supabase
      .from("server_members" as any)
      .select("server_id")
      .eq("user_id", user.id);
    if (!memberships || memberships.length === 0) {
      setServers([]);
      setFolders([]);
      setLoading(false);
      return;
    }
    const ids = memberships.map((m: any) => m.server_id);
    const { data } = await supabase
      .from("servers" as any)
      .select("id, name, icon_url, owner_id, invite_code")
      .in("id", ids);
    setServers((data as any) || []);

    // Load folders
    const { data: folderData } = await supabase
      .from("server_folders" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("position");
    const { data: folderItems } = await supabase
      .from("server_folder_items" as any)
      .select("*")
      .in("folder_id", (folderData || []).map((f: any) => f.id))
      .order("position");

    const folderMap = new Map<string, Folder>();
    (folderData || []).forEach((f: any) => {
      folderMap.set(f.id, { id: f.id, name: f.name, color: f.color, position: f.position, serverIds: [] });
    });
    (folderItems || []).forEach((item: any) => {
      const folder = folderMap.get(item.folder_id);
      if (folder) folder.serverIds.push(item.server_id);
    });
    setFolders(Array.from(folderMap.values()));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
    if (!user) return;
    const channel = supabase
      .channel("server-members-rail")
      .on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `user_id=eq.${user.id}` }, () => loadData())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user, loadData]);

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

  // Create a new folder from two servers
  const createFolder = async (serverIdA: string, serverIdB: string) => {
    if (!user) return;
    const { data: folder } = await supabase
      .from("server_folders" as any)
      .insert({ user_id: user.id, name: "Folder", color: "#5865F2", position: folders.length } as any)
      .select("*")
      .single();
    if (!folder) return;
    await supabase.from("server_folder_items" as any).insert([
      { folder_id: (folder as any).id, server_id: serverIdA, position: 0 },
      { folder_id: (folder as any).id, server_id: serverIdB, position: 1 },
    ] as any);

    setPendingFolderServers([serverIdA, serverIdB]);
    setEditingFolder({ id: (folder as any).id, name: "Folder", color: "#5865F2", position: folders.length, serverIds: [serverIdA, serverIdB] });
    setFolderDialogOpen(true);
    await loadData();
  };

  // Add server to existing folder
  const addToFolder = async (folderId: string, serverId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder || folder.serverIds.includes(serverId)) return;
    await supabase.from("server_folder_items" as any).insert({
      folder_id: folderId,
      server_id: serverId,
      position: folder.serverIds.length,
    } as any);
    await loadData();
  };

  // Ungroup folder
  const ungroupFolder = async (folderId: string) => {
    await supabase.from("server_folder_items" as any).delete().eq("folder_id", folderId);
    await supabase.from("server_folders" as any).delete().eq("id", folderId);
    await loadData();
  };

  // Save folder name/color
  const saveFolderEdit = async (name: string, color: string) => {
    if (!editingFolder) return;
    await supabase.from("server_folders" as any)
      .update({ name, color } as any)
      .eq("id", editingFolder.id);
    await loadData();
    setEditingFolder(null);
  };

  // Handle drag start on loose server
  const handleDragStart = (e: React.DragEvent, serverId: string) => {
    e.dataTransfer.setData("server-id", serverId);
    setDraggedServerId(serverId);
  };

  // Handle drop on a loose server (create folder)
  const handleDropOnServer = (e: React.DragEvent, targetServerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData("server-id");
    const fromFolder = e.dataTransfer.getData("from-folder");
    if (!sourceId || sourceId === targetServerId) return;

    // If dragged from a folder, remove from that folder first
    if (fromFolder) {
      supabase.from("server_folder_items" as any).delete()
        .eq("folder_id", fromFolder)
        .eq("server_id", sourceId)
        .then(() => {
          createFolder(sourceId, targetServerId);
        });
    } else {
      createFolder(sourceId, targetServerId);
    }
    setDraggedServerId(null);
  };

  // Handle drop on a folder
  const handleDropOnFolder = (folderId: string, serverId: string) => {
    addToFolder(folderId, serverId);
    setDraggedServerId(null);
  };

  return (
    <>
      <div className={`w-[72px] flex flex-col items-center py-3 gap-2 bg-sidebar-background/30 backdrop-blur-sm shrink-0 overflow-y-auto ${onNavigate ? '' : 'border-e border-sidebar-border'}`}>
        {/* Home button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { navigate("/"); onNavigate?.(); }}
              className={`flex items-center justify-center w-12 h-12 rounded-2xl transition-all hover:rounded-xl ${
                location.pathname === "/" || location.pathname === "/friends" || location.pathname.startsWith("/chat/") || location.pathname.startsWith("/group/")
                  ? "bg-primary text-primary-foreground rounded-xl"
                  : "bg-sidebar-accent/30 text-sidebar-foreground hover:bg-primary/20 hover:text-primary"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.73 4.87l-3.01-.75c-.1-.03-.2.01-.26.08L14.84 6.3c-2.12-.7-4.56-.7-6.68 0L6.54 4.2a.24.24 0 0 0-.26-.08l-3.01.75a.24.24 0 0 0-.17.19 16.76 16.76 0 0 0 1.51 11.85c.08.14.25.16.36.06l2.6-2.33c.67.52 1.44.94 2.27 1.23l-.42 3.28c-.02.12.07.23.19.25l3.04.47a.24.24 0 0 0 .27-.18l.9-3.12a10 10 0 0 0 2.36 0l.9 3.12a.24.24 0 0 0 .27.18l3.04-.47a.24.24 0 0 0 .19-.25l-.42-3.28c.83-.29 1.6-.71 2.27-1.23l2.6 2.33c.11.1.28.08.36-.06A16.76 16.76 0 0 0 19.9 5.06a.24.24 0 0 0-.17-.19zM9 13.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
              </svg>
            </button>
          </TooltipTrigger>
        </Tooltip>

        <Separator className="w-8 mx-auto" />

        {/* Server icons + folders */}
        {loading ? (
          <ServerRailSkeleton count={3} />
        ) : (
          <div className="contents animate-fade-in">
            {/* Render folders first */}
            {folders.map((folder) => {
              const folderServers = folder.serverIds
                .map((id) => servers.find((s) => s.id === id))
                .filter(Boolean) as Server[];
              if (folderServers.length === 0) return null;
              return (
                <ServerFolder
                  key={folder.id}
                  folderId={folder.id}
                  name={folder.name}
                  color={folder.color}
                  servers={folderServers}
                  onRename={() => {
                    setEditingFolder(folder);
                    setFolderDialogOpen(true);
                  }}
                  onUngroup={() => ungroupFolder(folder.id)}
                  onNavigate={onNavigate}
                  onDropServer={(serverId) => handleDropOnFolder(folder.id, serverId)}
                  unreadMap={unreadMap}
                />
              );
            })}

            {/* Render loose servers */}
            {looseServers.map((s) => {
              const hasUnread = unreadMap.get(s.id) || false;
              const voiceActivity = voiceActivityMap.get(s.id);

              return (
                <ContextMenu key={s.id}>
                  <Tooltip>
                    <ContextMenuTrigger asChild>
                      <TooltipTrigger asChild>
                        <div
                          className="relative"
                          draggable
                          onDragStart={(e) => handleDragStart(e, s.id)}
                          onDragEnd={() => setDraggedServerId(null)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={(e) => handleDropOnServer(e, s.id)}
                        >
                          {hasUnread && (
                            <div className="absolute -start-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full z-10" />
                          )}
                          <NavLink
                            to={`/server/${s.id}`}
                            onClick={() => onNavigate?.()}
                            className={({ isActive }) =>
                              `flex items-center justify-center w-12 h-12 rounded-2xl transition-all hover:rounded-xl ${
                                isActive ? "bg-primary text-primary-foreground rounded-xl" : "bg-sidebar-accent/30 text-sidebar-foreground hover:bg-primary/20"
                              } ${draggedServerId && draggedServerId !== s.id ? "ring-2 ring-transparent hover:ring-primary/50" : ""}`
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
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-sidebar-accent/30 text-sidebar-foreground hover:bg-primary/20 hover:text-primary hover:rounded-xl transition-all"
            >
              <Plus className="h-5 w-5" />
            </button>
          </TooltipTrigger>
        </Tooltip>

        {/* Join server */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setJoinOpen(true)}
              className="flex items-center justify-center w-12 h-12 rounded-2xl bg-sidebar-accent/30 text-sidebar-foreground hover:bg-primary/20 hover:text-primary hover:rounded-xl transition-all"
            >
              <LogIn className="h-5 w-5" />
            </button>
          </TooltipTrigger>
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
      <ServerFolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        initialName={editingFolder?.name || "Folder"}
        initialColor={editingFolder?.color || "#5865F2"}
        onSave={saveFolderEdit}
      />
    </>
  );
};

export default ServerRail;
