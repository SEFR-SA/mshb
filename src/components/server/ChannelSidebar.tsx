import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Hash, Volume2, Plus, Copy, Settings, LogOut, Lock, MoreVertical, Pencil, Trash2, Users, Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, Monitor, MonitorOff, Video, VideoOff, ChevronDown, FolderPlus, Megaphone, Music } from "lucide-react";
import VoiceUserContextMenu from "./VoiceUserContextMenu";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useChannelUnread } from "@/hooks/useChannelUnread";
import { ChannelListSkeleton } from "@/components/skeletons/SkeletonLoaders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/utils";
import { getAppBaseUrl } from "@/lib/inviteUtils";
import ServerSettingsDialog from "./ServerSettingsDialog";
import InviteModal from "./InviteModal";
import GoLiveModal from "@/components/GoLiveModal";
import ServerTagBadgeIcon from "@/components/ServerTagBadgeIcon";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { usePresence } from "@/hooks/usePresence";
import { useIsMobile } from "@/hooks/use-mobile";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { NavLink as RouterNavLink } from "react-router-dom";

interface Channel {
  id: string;
  name: string;
  type: string;
  category: string;
  position: number;
  is_private: boolean;
  is_announcement?: boolean;
}

interface Server {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  icon_url: string | null;
  banner_url: string | null;
  server_tag_name: string | null;
  server_tag_badge: string | null;
  server_tag_color: string | null;
}

interface VoiceParticipant {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_speaking: boolean;
  is_muted: boolean;
  is_deafened: boolean;
  is_screen_sharing: boolean;
}

interface ServerMember {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface Props {
  serverId: string;
  activeChannelId?: string;
  onChannelSelect?: (channel: { id: string; name: string; type: string; is_private?: boolean; is_announcement?: boolean }) => void;
  onVoiceChannelSelect?: (channel: { id: string; name: string }) => void;
  activeVoiceChannelId?: string;
}

const StreamPreviewVideo = ({ stream }: { stream: MediaStream }) => {
  const ref = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay muted playsInline className="w-full h-full object-contain" />;
};

const ChannelSidebar = ({ serverId, activeChannelId, onChannelSelect, onVoiceChannelSelect, activeVoiceChannelId }: Props) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { globalMuted, globalDeafened, toggleGlobalMute, toggleGlobalDeafen } = useAudioSettings();
  const { voiceChannel, disconnectVoice, isScreenSharing, setIsScreenSharing, remoteScreenStream, setRemoteScreenStream, setScreenSharerName, isCameraOn, setIsWatchingStream, nativeResolutionLabel } = useVoiceChannel();
  const { getUserStatus } = usePresence();
  const isMobile = useIsMobile();
  const status = (getUserStatus(profile) || "online") as UserStatus;
  const [server, setServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [newCategory, setNewCategory] = useState("Text Channels");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [serverMembers, setServerMembers] = useState<ServerMember[]>([]);
  const [voiceParticipants, setVoiceParticipants] = useState<Map<string, VoiceParticipant[]>>(new Map());
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [streamCardOpen, setStreamCardOpen] = useState<string | null>(null);
  // speakingUsers state removed — now driven by p.is_speaking from DB

  // Edit/Delete/Manage members state
  const [editOpen, setEditOpen] = useState(false);
  const [editChannel, setEditChannel] = useState<Channel | null>(null);
  const [editName, setEditName] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editMembers, setEditMembers] = useState<string[]>([]);
  const [manageMembersOpen, setManageMembersOpen] = useState(false);
  const [manageMembersChannel, setManageMembersChannel] = useState<Channel | null>(null);
  const [manageMembersSelected, setManageMembersSelected] = useState<string[]>([]);
  const [deleteChannelId, setDeleteChannelId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [useCustomCategory, setUseCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState("");

  // Drag-and-drop state
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragType, setDragType] = useState<"channel" | "section" | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Soundboard
  const [serverSounds, setServerSounds] = useState<{ id: string; name: string; url: string }[]>([]);
  const [soundboardOpen, setSoundboardOpen] = useState(false);

  useEffect(() => {
    if (!voiceChannel?.serverId) { setServerSounds([]); return; }
    supabase
      .from("server_soundboard" as any)
      .select("id, name, url")
      .eq("server_id", voiceChannel.serverId)
      .order("created_at")
      .then(({ data }) => setServerSounds((data as any[]) || []));
  }, [voiceChannel?.serverId]);

  const playSoundboardSound = (url: string) => {
    window.dispatchEvent(new CustomEvent("play-soundboard", { detail: { url } }));
    setSoundboardOpen(false);
  };

  // Section rename/delete state
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null);
  const [renameCategoryValue, setRenameCategoryValue] = useState("");

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  };

  const isAdmin = server?.owner_id === user?.id;

  const textChannelIds = useMemo(() => channels.filter((c) => c.type === "text").map((c) => c.id), [channels]);
  const unreadSet = useChannelUnread(textChannelIds);
  useEffect(() => {
    const load = async () => {
      const { data: s } = await supabase.from("servers" as any).select("*").eq("id", serverId).maybeSingle();
      setServer(s as any);
      const { data: ch } = await supabase.from("channels" as any).select("*").eq("server_id", serverId).order("position");
      setChannels((ch as any) || []);
      setChannelsLoading(false);

      // Fetch current user's role
      if (user) {
        const { data: memberData } = await supabase
          .from("server_members" as any)
          .select("role")
          .eq("server_id", serverId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (memberData) setCurrentUserRole((memberData as any).role);
      }
    };
    load();

    const channel = supabase
      .channel(`channels-${serverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "channels", filter: `server_id=eq.${serverId}` }, () => load())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [serverId]);

  const fetchServerMembers = useCallback(async () => {
    const { data } = await supabase
      .from("server_members" as any)
      .select("user_id")
      .eq("server_id", serverId);
    if (!data) return;
    const userIds = (data as any[]).map((d) => d.user_id).filter((id: string) => id !== user?.id);
    if (userIds.length === 0) { setServerMembers([]); return; }
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", userIds);
    setServerMembers((profiles || []) as ServerMember[]);
  }, [serverId, user?.id]);

  const fetchVoiceParticipants = useCallback(async () => {
    const voiceChannelIds = channels.filter((c) => c.type === "voice").map((c) => c.id);
    if (voiceChannelIds.length === 0) { setVoiceParticipants(new Map()); return; }

    const { data } = await supabase
      .from("voice_channel_participants")
      .select("channel_id, user_id, is_speaking, is_muted, is_deafened, is_screen_sharing")
      .in("channel_id", voiceChannelIds);
    if (!data || data.length === 0) { setVoiceParticipants(new Map()); return; }

    const userIds = [...new Set(data.map((d) => d.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const grouped = new Map<string, VoiceParticipant[]>();
    data.forEach((d) => {
      const p = profileMap.get(d.user_id);
      const list = grouped.get(d.channel_id) || [];
      list.push({
        user_id: d.user_id,
        display_name: p?.display_name || null,
        username: p?.username || null,
        avatar_url: p?.avatar_url || null,
        is_speaking: !!(d as any).is_speaking,
        is_muted: !!(d as any).is_muted,
        is_deafened: !!(d as any).is_deafened,
        is_screen_sharing: !!(d as any).is_screen_sharing,
      });
      grouped.set(d.channel_id, list);
    });
    setVoiceParticipants(grouped);
  }, [channels]);

  useEffect(() => {
    fetchVoiceParticipants();
  }, [fetchVoiceParticipants]);

  useEffect(() => {
    if (channels.filter((c) => c.type === "voice").length === 0) return;
    const sub = supabase
      .channel(`voice-sidebar-${serverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_channel_participants" }, () => fetchVoiceParticipants())
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [serverId, fetchVoiceParticipants]);

  // Fallback: listen for a window event dispatched by VoiceConnectionBar after joining,
  // in case the postgres_changes subscription misses the self-insert event.
  useEffect(() => {
    const handler = () => fetchVoiceParticipants();
    window.addEventListener("voice-participants-changed", handler);
    return () => window.removeEventListener("voice-participants-changed", handler);
  }, [fetchVoiceParticipants]);

  // Speaking state is now driven by is_speaking column in voice_channel_participants
  // The existing postgres_changes subscription (line 168-173) already refetches on changes

  const existingCategories = useMemo(() => [...new Set(channels.map(ch => ch.category))], [channels]);

  const handleCreateChannel = async () => {
    if (!newName.trim() || newName.trim().length > 17) return;
    const categoryToSave = useCustomCategory ? customCategory.trim() : newCategory;
    if (!categoryToSave) return;
    const { data: newChannel } = await supabase.from("channels" as any).insert({
      server_id: serverId,
      name: newName.trim().toLowerCase().replace(/\s+/g, "-"),
      type: newType,
      category: categoryToSave,
      is_private: isPrivate,
      is_announcement: newType === "text" ? isAnnouncement : false,
    } as any).select().maybeSingle();

    if (newChannel && isPrivate) {
      const membersToAdd = [...selectedMembers, user?.id].filter(Boolean).map((uid) => ({
        channel_id: (newChannel as any).id,
        user_id: uid,
      }));
      if (membersToAdd.length > 0) {
        await supabase.from("channel_members" as any).insert(membersToAdd as any);
      }
    }

    if (newChannel) {
      await supabase.from("server_audit_logs" as any).insert({
        server_id: serverId,
        actor_id: user?.id,
        action_type: "channel_created",
        target_id: (newChannel as any).id,
        changes: {
          channel_name: (newChannel as any).name,
          channel_type: newType,
        },
      } as any);
    }

    setNewName("");
    setIsPrivate(false);
    setIsAnnouncement(false);
    setSelectedMembers([]);
    setUseCustomCategory(false);
    setCustomCategory("");
    setCreateOpen(false);
  };

  const copyInvite = async () => {
    if (server?.invite_code) {
      const url = `${getAppBaseUrl()}/invite/${server.invite_code}`;
      const ok = await copyToClipboard(url);
      if (ok) {
        toast({ title: t("servers.copiedInvite") });
      } else {
        toast({ title: t("common.error"), description: t("servers.copyFailed"), variant: "destructive" });
      }
    }
  };


  // --- Edit Channel ---
  const openEditDialog = async (ch: Channel) => {
    setEditChannel(ch);
    setEditName(ch.name);
    setEditIsPrivate(ch.is_private);
    setEditMembers([]);
    if (ch.is_private) {
      await loadChannelMembers(ch.id, setEditMembers);
    }
    if (serverMembers.length === 0) await fetchServerMembers();
    setEditOpen(true);
  };

  const handleEditChannel = async () => {
    if (!editChannel || !editName.trim()) return;
    const name = editName.trim().toLowerCase().replace(/\s+/g, "-");
    await supabase.from("channels" as any).update({ name, is_private: editIsPrivate } as any).eq("id", editChannel.id);

    if (!editIsPrivate && editChannel.is_private) {
      // Switched from private to public — remove all channel_members
      await supabase.from("channel_members" as any).delete().eq("channel_id", editChannel.id);
    } else if (editIsPrivate) {
      // Sync members
      await syncChannelMembers(editChannel.id, editMembers);
    }

    toast({ title: t("channels.updated") });
    setEditOpen(false);
    setEditChannel(null);
  };

  // --- Manage Members ---
  const openManageMembers = async (ch: Channel) => {
    setManageMembersChannel(ch);
    setManageMembersSelected([]);
    await loadChannelMembers(ch.id, setManageMembersSelected);
    if (serverMembers.length === 0) await fetchServerMembers();
    setManageMembersOpen(true);
  };

  const handleSaveMembers = async () => {
    if (!manageMembersChannel) return;
    await syncChannelMembers(manageMembersChannel.id, manageMembersSelected);
    toast({ title: t("channels.updated") });
    setManageMembersOpen(false);
    setManageMembersChannel(null);
  };

  // --- Delete Channel ---
  const handleDeleteChannel = async () => {
    if (!deleteChannelId) return;
    const idToDelete = deleteChannelId;
    setDeleteChannelId(null);
    setChannels(prev => prev.filter(c => c.id !== idToDelete));
    await supabase.from("channels" as any).delete().eq("id", idToDelete);
    toast({ title: t("channels.deleted") });
  };

  // --- Helpers ---
  const loadChannelMembers = async (channelId: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    const { data } = await supabase.from("channel_members" as any).select("user_id").eq("channel_id", channelId);
    if (data) {
      setter((data as any[]).map((d) => d.user_id).filter((id: string) => id !== user?.id));
    }
  };

  const syncChannelMembers = async (channelId: string, selectedIds: string[]) => {
    const { data: existing } = await supabase.from("channel_members" as any).select("user_id").eq("channel_id", channelId);
    const existingIds = (existing as any[] || []).map((d) => d.user_id);
    const allSelected = [...new Set([...selectedIds, user?.id].filter(Boolean) as string[])];

    const toAdd = allSelected.filter((id) => !existingIds.includes(id));
    const toRemove = existingIds.filter((id: string) => !allSelected.includes(id));

    if (toAdd.length > 0) {
      await supabase.from("channel_members" as any).insert(toAdd.map((uid) => ({ channel_id: channelId, user_id: uid })) as any);
    }
    if (toRemove.length > 0) {
      await supabase.from("channel_members" as any).delete().eq("channel_id", channelId).in("user_id", toRemove);
    }
  };

  const grouped = channels.reduce<Record<string, Channel[]>>((acc, ch) => {
    (acc[ch.category] = acc[ch.category] || []).push(ch);
    return acc;
  }, {});

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  // --- Rename Section ---
  const handleRenameCategory = async (oldName: string, newName: string) => {
    if (!newName.trim() || newName.trim() === oldName) { setRenamingCategory(null); return; }
    await supabase.from("channels" as any).update({ category: newName.trim() } as any).eq("server_id", serverId).eq("category", oldName);
    setRenamingCategory(null);
    toast({ title: "Section renamed" });
  };

  // --- Drag-and-Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, id: string, type: "channel" | "section") => {
    setDragItem(id);
    setDragType(type);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setDragType(null);
    setDragOverTarget(null);
  };

  const handleChannelDragOver = (e: React.DragEvent, channelId: string) => {
    if (dragType !== "channel") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTarget(channelId);
  };

  const handleChannelDrop = async (e: React.DragEvent, targetId: string, targetCategory: string) => {
    e.preventDefault();
    if (dragType !== "channel" || !dragItem || dragItem === targetId) { handleDragEnd(); return; }

    const allChannels = [...channels];
    const draggedIdx = allChannels.findIndex(c => c.id === dragItem);
    const targetIdx = allChannels.findIndex(c => c.id === targetId);
    if (draggedIdx === -1 || targetIdx === -1) { handleDragEnd(); return; }

    // Move dragged channel to target position
    const [dragged] = allChannels.splice(draggedIdx, 1);
    dragged.category = targetCategory;
    const newTargetIdx = allChannels.findIndex(c => c.id === targetId);
    allChannels.splice(newTargetIdx, 0, dragged);

    // Optimistic update
    const updated = allChannels.map((ch, i) => ({ ...ch, position: i }));
    setChannels(updated);
    handleDragEnd();

    // Persist positions
    for (const ch of updated) {
      await supabase.from("channels" as any).update({ position: ch.position, category: ch.category } as any).eq("id", ch.id);
    }
  };

  const handleSectionDragOver = (e: React.DragEvent, category: string) => {
    if (dragType !== "section") return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTarget(`section-${category}`);
  };

  const handleSectionDrop = async (e: React.DragEvent, targetCategory: string) => {
    e.preventDefault();
    if (dragType !== "section" || !dragItem || dragItem === targetCategory) { handleDragEnd(); return; }

    const categoryOrder = Object.keys(grouped);
    const fromIdx = categoryOrder.indexOf(dragItem);
    const toIdx = categoryOrder.indexOf(targetCategory);
    if (fromIdx === -1 || toIdx === -1) { handleDragEnd(); return; }

    // Reorder categories
    const [moved] = categoryOrder.splice(fromIdx, 1);
    categoryOrder.splice(toIdx, 0, moved);

    // Rebuild channel order based on new category order
    const reordered: Channel[] = [];
    categoryOrder.forEach(cat => {
      const catChannels = grouped[cat] || [];
      catChannels.forEach(ch => reordered.push(ch));
    });
    const updated = reordered.map((ch, i) => ({ ...ch, position: i }));
    setChannels(updated);
    handleDragEnd();

    for (const ch of updated) {
      await supabase.from("channels" as any).update({ position: ch.position } as any).eq("id", ch.id);
    }
  };

  const renderAdminDropdown = (ch: Channel) => {
    if (!isAdmin) return null;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5 rounded transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => openEditDialog(ch)}>
            <Pencil className="h-3.5 w-3.5 me-2" />
            {t("channels.edit")}
          </DropdownMenuItem>
          {ch.is_private && (
            <DropdownMenuItem onClick={() => openManageMembers(ch)}>
              <Users className="h-3.5 w-3.5 me-2" />
              {t("channels.manageMembers")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteChannelId(ch.id)}>
            <Trash2 className="h-3.5 w-3.5 me-2" />
            {t("channels.delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const renderMemberPicker = (selected: string[], toggle: (id: string) => void) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{t("channels.selectMembers")}</Label>
      <ScrollArea className="h-[200px] border border-border rounded-md p-2">
        {serverMembers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">{t("common.loading")}</p>
        ) : (
          serverMembers.map((m) => (
            <label key={m.user_id} className="flex items-center gap-3 py-1.5 px-1 rounded hover:bg-muted/50 cursor-pointer">
              <Checkbox
                checked={selected.includes(m.user_id)}
                onCheckedChange={() => toggle(m.user_id)}
              />
              <Avatar className="h-6 w-6">
                <AvatarImage src={m.avatar_url || ""} />
                <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                  {(m.display_name || m.username || "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">{m.display_name || m.username || "User"}</span>
            </label>
          ))
        )}
      </ScrollArea>
    </div>
  );

  return (
    <>
      <div className="w-[240px] max-md:w-full max-md:max-w-full h-full flex flex-col bg-card/30 backdrop-blur-sm border-e border-sidebar-border shrink-0 max-md:shrink max-md:min-w-0 overflow-hidden">
        {server?.banner_url && (
          <img
            src={server.banner_url}
            alt=""
            className="w-full h-24 object-cover shrink-0"
          />
        )}
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
            <h2 className="font-bold text-sm truncate">{server?.name || "..."}</h2>
            {server?.server_tag_name && (
              <span
                className="inline-flex items-center gap-1 shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-sm leading-none whitespace-nowrap text-white"
                style={{ backgroundColor: server.server_tag_color || "#5865f2" }}
              >
                <ServerTagBadgeIcon badgeName={server.server_tag_badge} className="h-2.5 w-2.5" />
                {server.server_tag_name.substring(0, 4).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInviteModalOpen(true)} title={t("servers.copyInvite")}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {isAdmin && (
              <>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setUseCustomCategory(true); setCustomCategory(""); setNewCategory(""); setCreateOpen(true); }} title="Create Section">
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSettingsOpen(true)} title={t("servers.settings")}>
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {channelsLoading ? (
            <ChannelListSkeleton count={4} />
          ) : (
            <div className="animate-fade-in space-y-4">
              {Object.entries(grouped).map(([category, chs]) => (
                <Collapsible key={category} open={!collapsedCategories.has(category)}>
                  <div
                    className={`flex items-center justify-between px-1 mb-1 rounded ${dragOverTarget === `section-${category}` ? 'bg-primary/10' : ''}`}
                    draggable={isAdmin}
                    onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, category, "section"); }}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleSectionDragOver(e, category)}
                    onDrop={(e) => handleSectionDrop(e, category)}
                  >
                    <CollapsibleTrigger onClick={() => toggleCategory(category)} className="flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors flex-1 min-w-0">
                      <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-200 shrink-0 ${collapsedCategories.has(category) ? '-rotate-90' : ''}`} />
                      {renamingCategory === category ? (
                        <Input
                          className="h-5 text-[11px] font-semibold uppercase px-1 py-0"
                          value={renameCategoryValue}
                          onChange={(e) => setRenameCategoryValue(e.target.value)}
                          onBlur={() => handleRenameCategory(category, renameCategoryValue)}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") handleRenameCategory(category, renameCategoryValue);
                            if (e.key === "Escape") setRenamingCategory(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                        />
                      ) : (
                        <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide truncate">{category}</span>
                      )}
                    </CollapsibleTrigger>
                    {isAdmin && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 hover:opacity-100 focus:opacity-100 p-0.5" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-3 w-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => { setRenamingCategory(category); setRenameCategoryValue(category); }}>
                              <Pencil className="h-3.5 w-3.5 me-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              disabled={chs.length > 0}
                              onClick={() => {
                                if (chs.length > 0) {
                                  toast({ title: "Section not empty", description: "Delete all channels first." });
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5 me-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <button
                          onClick={() => { setNewCategory(category); setNewType(category.toLowerCase().includes("voice") ? "voice" : "text"); setCreateOpen(true); }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <CollapsibleContent>
                    {chs.map((ch) => {
                      const ChannelIcon = ch.is_private ? Lock : (ch.type === "voice" ? Volume2 : (ch.is_announcement ? Megaphone : Hash));

                      if (ch.type === "voice") {
                        const participants = voiceParticipants.get(ch.id) || [];
                        const hasParticipants = participants.length > 0;
                        return (
                          <div key={ch.id}>
                            {dragOverTarget === ch.id && dragType === "channel" && <div className="h-0.5 bg-primary rounded-full mx-2" />}
                            <div
                              className={`group flex items-center ${dragItem === ch.id ? 'opacity-50' : ''}`}
                              draggable={isAdmin}
                              onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, ch.id, "channel"); }}
                              onDragEnd={handleDragEnd}
                              onDragOver={(e) => handleChannelDragOver(e, ch.id)}
                              onDrop={(e) => handleChannelDrop(e, ch.id, category)}
                            >
                              <button
                                onClick={() => onVoiceChannelSelect?.({ id: ch.id, name: ch.name })}
                                className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent/50 ${hasParticipants
                                    ? "font-bold text-white"
                                    : "font-medium text-[#949BA4] hover:text-[#DBDEE1]"
                                  }`}
                              >
                                <ChannelIcon className={`h-4 w-4 shrink-0 ${hasParticipants && !ch.is_private ? "text-green-500" : ""}`} />
                                <span className="truncate">{ch.name}</span>
                              </button>
                              {renderAdminDropdown(ch)}
                            </div>
                            {participants.map((p) => {
                              const isScreenSharer = p.is_screen_sharing && p.user_id !== user?.id;

                              const innerRow = (
                                <div className="relative group flex items-center gap-2 ps-8 py-1 text-xs text-muted-foreground cursor-default">
                                  <div className="relative shrink-0">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={p.avatar_url || ""} />
                                      <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                                        {(p.display_name || p.username || "U").charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                    {p.is_screen_sharing && (
                                      <span className="absolute -bottom-1 -end-1 bg-green-600 text-white text-[7px] font-bold leading-none px-0.5 py-px rounded-sm">
                                        {t("streaming.live")}
                                      </span>
                                    )}
                                  </div>
                                  <span className="truncate">{p.display_name || p.username || "User"}</span>
                                  {p.is_screen_sharing && (
                                    <Monitor className="h-3 w-3 text-green-500 shrink-0" />
                                  )}
                                  {p.is_deafened ? (
                                    <HeadphoneOff className="h-3 w-3 text-destructive shrink-0" />
                                  ) : p.is_muted ? (
                                    <MicOff className="h-3 w-3 text-destructive shrink-0" />
                                  ) : p.is_speaking ? (
                                    <Mic className="h-3 w-3 text-[#00db21] shrink-0 animate-pulse" />
                                  ) : null}
                                  {isScreenSharer && isMobile && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setIsWatchingStream(true); }}
                                      className="absolute end-1 opacity-100 transition-opacity bg-green-600 hover:bg-green-500 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded cursor-pointer"
                                    >
                                      {t("streaming.watch")}
                                    </button>
                                  )}
                                </div>
                              );

                              if (!isMobile && isScreenSharer) {
                                const clickableRow = (
                                  <div className="relative group flex items-center gap-2 ps-8 py-1 text-xs text-muted-foreground cursor-pointer">
                                    <div className="relative shrink-0">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={p.avatar_url || ""} />
                                        <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                                          {(p.display_name || p.username || "U").charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="absolute -bottom-1 -end-1 bg-green-600 text-white text-[7px] font-bold leading-none px-0.5 py-px rounded-sm">
                                        {t("streaming.live")}
                                      </span>
                                    </div>
                                    <span className="truncate">{p.display_name || p.username || "User"}</span>
                                    <Monitor className="h-3 w-3 text-green-500 shrink-0" />
                                    {p.is_deafened ? (
                                      <HeadphoneOff className="h-3 w-3 text-destructive shrink-0" />
                                    ) : p.is_muted ? (
                                      <MicOff className="h-3 w-3 text-destructive shrink-0" />
                                    ) : p.is_speaking ? (
                                      <Mic className="h-3 w-3 text-[#00db21] shrink-0 animate-pulse" />
                                    ) : null}
                                  </div>
                                );
                                return (
                                  <Popover
                                    key={p.user_id}
                                    open={streamCardOpen === p.user_id}
                                    onOpenChange={(open) => setStreamCardOpen(open ? p.user_id : null)}
                                  >
                                    <VoiceUserContextMenu
                                      targetUserId={p.user_id}
                                      targetUsername={p.username || undefined}
                                      serverId={serverId}
                                      channelId={ch.id}
                                      serverOwnerId={server?.owner_id || ""}
                                      currentUserRole={currentUserRole}
                                    >
                                      <PopoverTrigger asChild>
                                        {clickableRow}
                                      </PopoverTrigger>
                                    </VoiceUserContextMenu>
                                    <PopoverContent side="right" align="start" sideOffset={8} className="w-[280px] p-0 overflow-hidden rounded-lg">
                                      <div className="aspect-video bg-black flex items-center justify-center">
                                        {remoteScreenStream
                                          ? <StreamPreviewVideo stream={remoteScreenStream} />
                                          : <Monitor className="h-8 w-8 text-muted-foreground" />
                                        }
                                      </div>
                                      <div className="p-3 flex flex-col items-center gap-2.5">
                                        <p className="text-xs font-semibold text-foreground text-center">
                                          {p.display_name || p.username || "User"} · {t("streaming.live")}
                                        </p>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); setIsWatchingStream(true); setStreamCardOpen(null); }}
                                          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold py-1.5 rounded-md transition-colors"
                                        >
                                          {t("streaming.watchStream")}
                                        </button>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                );
                              }

                              return (
                                <VoiceUserContextMenu
                                  key={p.user_id}
                                  targetUserId={p.user_id}
                                  targetUsername={p.username || undefined}
                                  serverId={serverId}
                                  channelId={ch.id}
                                  serverOwnerId={server?.owner_id || ""}
                                  currentUserRole={currentUserRole}
                                >
                                  {innerRow}
                                </VoiceUserContextMenu>
                              );
                            })}
                          </div>
                        );
                      }
                      return (
                        <div key={ch.id}>
                          {dragOverTarget === ch.id && dragType === "channel" && <div className="h-0.5 bg-primary rounded-full mx-2" />}
                          <div
                            className={`group flex items-center ${dragItem === ch.id ? 'opacity-50' : ''}`}
                            draggable={isAdmin}
                            onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, ch.id, "channel"); }}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleChannelDragOver(e, ch.id)}
                            onDrop={(e) => handleChannelDrop(e, ch.id, category)}
                          >
                            <NavLink
                              to={`/server/${serverId}/channel/${ch.id}`}
                              onClick={() => onChannelSelect?.({ id: ch.id, name: ch.name, type: ch.type, is_private: ch.is_private, is_announcement: ch.is_announcement })}
                              className={({ isActive }) =>
                                `flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${isActive || ch.id === activeChannelId
                                  ? "bg-primary/10 border-s-2 border-primary text-primary font-bold"
                                  : unreadSet.has(ch.id)
                                    ? "text-foreground font-bold hover:bg-muted/50"
                                    : "font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                }`
                              }
                            >
                              <ChannelIcon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{ch.name}</span>
                              {unreadSet.has(ch.id) && !(activeChannelId === ch.id) && (
                                <div className="ms-auto w-2 h-2 bg-white rounded-full shrink-0" />
                              )}
                            </NavLink>
                            {renderAdminDropdown(ch)}
                          </div>
                        </div>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </div>

        {/* User Panel */}
        <div className="border-t border-sidebar-border shrink-0 bg-sidebar-background/50">
          {/* Voice connection status */}
          {voiceChannel && (
            <div className="flex items-center gap-2 px-3 py-2 bg-sidebar-accent/50">
              <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs font-medium truncate flex-1">#{voiceChannel.name}</span>
              {isScreenSharing && nativeResolutionLabel && (
                <span className="text-[10px] font-bold text-green-400 shrink-0 leading-none">
                  {nativeResolutionLabel}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 shrink-0 ${isCameraOn ? "text-green-500" : ""}`}
                onClick={() => {
                  const event = new CustomEvent("toggle-camera");
                  window.dispatchEvent(event);
                }}
                title={isCameraOn ? t("calls.stopCamera") : t("calls.startCamera")}
              >
                {isCameraOn ? <VideoOff className="h-3.5 w-3.5" /> : <Video className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`h-7 w-7 shrink-0 ${isScreenSharing ? "text-green-500" : ""}`}
                onClick={() => {
                  if (isScreenSharing) {
                    window.dispatchEvent(new CustomEvent("stop-screen-share"));
                  } else {
                    setGoLiveOpen(true);
                  }
                }}
                title={isScreenSharing ? t("calls.stopSharing") : t("calls.shareScreen")}
              >
                {isScreenSharing ? <MonitorOff className="h-3.5 w-3.5" /> : <Monitor className="h-3.5 w-3.5" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10 shrink-0" onClick={disconnectVoice}>
                <PhoneOff className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Audio controls + settings + leave */}
          <div className="flex items-center gap-1 px-2 py-1.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={toggleGlobalMute} title={globalMuted ? t("audio.unmute") : t("audio.mute")}>
              {globalMuted ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={toggleGlobalDeafen} title={globalDeafened ? t("audio.undeafen") : t("audio.deafen")}>
              {globalDeafened ? <HeadphoneOff className="h-4 w-4 text-destructive" /> : <Headphones className="h-4 w-4" />}
            </Button>
            {voiceChannel && serverSounds.length > 0 && (
              <Popover open={soundboardOpen} onOpenChange={setSoundboardOpen}>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title={t("voice.soundboard")}>
                    <Music className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-2" side="top">
                  <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">{t("voice.soundboard")}</p>
                  {serverSounds.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => playSoundboardSound(s.url)}
                      className="w-full text-start px-2 py-1.5 text-sm rounded hover:bg-accent"
                    >
                      {s.name}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            )}
            <RouterNavLink to="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title={t("nav.settings")}>
                <Settings className="h-4 w-4" />
              </Button>
            </RouterNavLink>
          </div>

          {/* User profile row */}
          <RouterNavLink to="/settings" className="flex items-center gap-2 px-2 py-1.5 hover:bg-sidebar-accent/50 transition-colors">
            <div className="relative shrink-0">
              <Avatar className="h-8 w-8">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-sm">
                  {(profile?.display_name || profile?.username || user?.email || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <StatusBadge status={status} size="sm" className="absolute bottom-0 end-0" />
            </div>
            <div className="truncate">
              <p className="text-sm font-medium truncate">{profile?.display_name || profile?.username || "User"}</p>
              {profile?.username && (
                <p className="text-[11px] text-muted-foreground truncate">@{profile.username}</p>
              )}
            </div>
          </RouterNavLink>
        </div>
      </div>

      {/* Go Live Modal */}
      <GoLiveModal
        open={goLiveOpen}
        onOpenChange={setGoLiveOpen}
        onGoLive={(settings) => {
          setGoLiveOpen(false);
          window.dispatchEvent(new CustomEvent("start-screen-share", { detail: settings }));
        }}
      />

      {/* Create Channel Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) { setIsPrivate(false); setIsAnnouncement(false); setSelectedMembers([]); setUseCustomCategory(false); setCustomCategory(""); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("channels.create")}</DialogTitle>
            <DialogDescription>{t("channels.createDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {/* Category selector */}
            <div>
              <Label className="text-sm font-medium">Section</Label>
              <Select
                value={useCustomCategory ? "__new__" : newCategory}
                onValueChange={(val) => {
                  if (val === "__new__") {
                    setUseCustomCategory(true);
                    setCustomCategory("");
                  } else {
                    setUseCustomCategory(false);
                    setNewCategory(val);
                  }
                }}
              >
                <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                <SelectContent>
                  {existingCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                  <SelectItem value="__new__">+ New Section...</SelectItem>
                </SelectContent>
              </Select>
              {useCustomCategory && (
                <Input
                  className="mt-2"
                  placeholder="Section name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  autoFocus
                />
              )}
            </div>

            <div>
              <Input
                placeholder={t("channels.namePlaceholder")}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateChannel()}
                maxLength={17}
              />
              <p className="text-xs text-muted-foreground mt-1 text-end">{newName.length}/17</p>
            </div>
            <Select value={newType} onValueChange={setNewType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">{t("channels.text")}</SelectItem>
                <SelectItem value="voice">{t("channels.voice")}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="private-toggle" className="text-sm font-medium">{t("channels.private")}</Label>
                <p className="text-xs text-muted-foreground">{t("channels.privateDesc")}</p>
              </div>
              <Switch
                id="private-toggle"
                checked={isPrivate}
                onCheckedChange={(checked) => {
                  setIsPrivate(checked);
                  if (checked && serverMembers.length === 0) fetchServerMembers();
                }}
              />
            </div>

            {isPrivate && renderMemberPicker(selectedMembers, toggleMember)}

            {newType === "text" && (
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="announcement-toggle" className="text-sm font-medium">{t("channels.announcement")}</Label>
                  <p className="text-xs text-muted-foreground">{t("channels.announcementDesc")}</p>
                </div>
                <Switch
                  id="announcement-toggle"
                  checked={isAnnouncement}
                  onCheckedChange={setIsAnnouncement}
                />
              </div>
            )}

            <Button onClick={handleCreateChannel} disabled={!newName.trim()} className="w-full">
              {t("channels.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Channel Dialog */}
      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setEditChannel(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("channels.edit")}</DialogTitle>
            <DialogDescription>{t("channels.editDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={t("channels.namePlaceholder")}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEditChannel()}
            />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="edit-private-toggle" className="text-sm font-medium">{t("channels.private")}</Label>
                <p className="text-xs text-muted-foreground">{t("channels.privateDesc")}</p>
              </div>
              <Switch
                id="edit-private-toggle"
                checked={editIsPrivate}
                onCheckedChange={(checked) => {
                  setEditIsPrivate(checked);
                  if (checked && serverMembers.length === 0) fetchServerMembers();
                }}
              />
            </div>

            {editIsPrivate && renderMemberPicker(editMembers, (id) =>
              setEditMembers((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
            )}

            <Button onClick={handleEditChannel} disabled={!editName.trim()} className="w-full">
              {t("actions.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={manageMembersOpen} onOpenChange={(open) => { setManageMembersOpen(open); if (!open) setManageMembersChannel(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("channels.manageMembers")}</DialogTitle>
            <DialogDescription>{t("channels.manageMembersDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {renderMemberPicker(manageMembersSelected, (id) =>
              setManageMembersSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
            )}
            <Button onClick={handleSaveMembers} className="w-full">
              {t("actions.save")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Channel Confirmation */}
      <AlertDialog open={!!deleteChannelId} onOpenChange={(open) => { if (!open) setDeleteChannelId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("channels.delete")}</AlertDialogTitle>
            <AlertDialogDescription>{t("channels.deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteChannel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("channels.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ServerSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} serverId={serverId} />
      <InviteModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} serverId={serverId} serverName={server?.name || ""} />
    </>
  );
};

export default ChannelSidebar;
