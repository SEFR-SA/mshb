import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Hash, Volume2, Plus, Link, Settings, LogOut, Lock, MoreVertical, Pencil, Trash2, Users, Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, Monitor, MonitorOff, Video, VideoOff, ChevronDown, FolderPlus, Megaphone, BookOpen, Music, Bell, BellOff, LifeBuoy, Ticket } from "lucide-react";
import VoiceUserContextMenu from "./VoiceUserContextMenu";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useChannelUnread } from "@/hooks/useChannelUnread";
import { ChannelListSkeleton } from "@/components/skeletons/SkeletonLoaders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/utils";
import { getAppBaseUrl } from "@/lib/inviteUtils";
import ServerSettingsDialog from "./ServerSettingsDialog";
import InviteModal from "./InviteModal";
import GoLiveModal from "@/components/GoLiveModal";
import ServerTagBadgeIcon from "@/components/ServerTagBadgeIcon";
import ChannelSettingsOverlay from "./ChannelSettingsOverlay";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { usePresence } from "@/hooks/usePresence";
import { useIsMobile } from "@/hooks/use-mobile";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import { useCreateChannel } from "@/contexts/CreateChannelContext";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { NavLink as RouterNavLink } from "react-router-dom";
import StyledDisplayName from "@/components/StyledDisplayName";
import { useChannelNotificationPref, type ChannelNotifLevel } from "@/hooks/useChannelNotificationPref";
import { useStreamTimer } from "@/hooks/useStreamTimer";
import { useVoiceTimer } from "@/hooks/useVoiceTimer";
import { useServerPermissions } from "@/hooks/useServerPermissions";


interface Channel {
  id: string;
  name: string;
  type: string;
  category: string;
  position: number;
  is_private: boolean;
  is_announcement?: boolean;
  is_rules?: boolean;
  restricted_permissions: string[];
}

interface Server {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  icon_url: string | null;
  banner_url: string | null;
  boost_level: number | null;
  is_community?: boolean;
  server_tag_name: string | null;
  server_tag_badge: string | null;
  server_tag_color: string | null;
  server_tag_container_color: string | null;
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
  server_muted?: boolean;
  server_deafened?: boolean;
  name_font?: string | null;
  name_effect?: string | null;
  name_gradient_start?: string | null;
  name_gradient_end?: string | null;
  joined_at?: string | null;
}

interface ServerMember {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  name_font?: string | null;
  name_effect?: string | null;
  name_gradient_start?: string | null;
  name_gradient_end?: string | null;
}

interface Props {
  serverId: string;
  activeChannelId?: string;
  onChannelSelect?: (channel: { id: string; name: string; type: string; is_private?: boolean; is_announcement?: boolean; is_rules?: boolean; description?: string | null }) => void;
  onVoiceChannelSelect?: (channel: { id: string; name: string; restricted_permissions?: string[] }) => void;
  activeVoiceChannelId?: string;
}

const StreamPreviewVideo = ({ stream }: { stream: MediaStream }) => {
  const ref = React.useRef<HTMLVideoElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay muted playsInline className="w-full h-full object-contain" />;
};

interface StreamPreviewCardProps {
  stream: MediaStream | null;
  streamingApp: string | null | undefined;
  streamStartedAt: string | null | undefined;
  participantName: string;
  nameFont?: string | null;
  nameEffect?: string | null;
  nameGradientStart?: string | null;
  nameGradientEnd?: string | null;
  onWatch: () => void;
}

const StreamPreviewCard = ({
  stream, streamingApp, streamStartedAt, participantName,
  nameFont, nameEffect, nameGradientStart, nameGradientEnd, onWatch,
}: StreamPreviewCardProps) => {
  const { t } = useTranslation();
  const timer = useStreamTimer(streamStartedAt);
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/60">
        <span className="text-zinc-400 text-xs">Streaming Now</span>
        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">LIVE</span>
      </div>
      {/* Video preview */}
      <div className="aspect-video bg-black flex items-center justify-center">
        {stream ? <StreamPreviewVideo stream={stream} /> : <Monitor className="h-8 w-8 text-muted-foreground" />}
      </div>
      {/* App info + button */}
      <div className="p-3 flex flex-col gap-2">
        {(streamingApp || timer) && (
          <div className="flex flex-col gap-0.5">
            {streamingApp && <p className="text-sm font-semibold text-white">{streamingApp}</p>}
            {timer && <p className="text-zinc-400 text-xs">{timer}</p>}
          </div>
        )}
        <button
          onClick={onWatch}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold py-1.5 rounded-md transition-colors"
        >
          {t("streaming.watchStream")}
        </button>
      </div>
    </>
  );
};

interface ChannelDropdownProps {
  ch: Channel;
  isAdmin: boolean;
  onEdit: () => void;
  onManageMembers: () => void;
  onDelete: () => void;
}

const ChannelDropdown = ({ ch, isAdmin, onEdit, onManageMembers, onDelete }: ChannelDropdownProps) => {
  const { t } = useTranslation();
  const { level, setLevel } = useChannelNotificationPref(ch.id);

  const handleNotifChange = (newLevel: ChannelNotifLevel | null) => {
    setLevel(newLevel);
  };

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
        {/* Notifications submenu - visible to all members */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Bell className="h-3.5 w-3.5 me-2" />
            {t("channels.notifications")}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuCheckboxItem
              checked={level === null}
              onCheckedChange={() => handleNotifChange(null)}
            >
              {t("channels.useServerDefault")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={level === "all_messages"}
              onCheckedChange={() => handleNotifChange("all_messages")}
            >
              {t("channels.allMessages")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={level === "only_mentions"}
              onCheckedChange={() => handleNotifChange("only_mentions")}
            >
              {t("channels.onlyMentions")}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={level === "nothing"}
              onCheckedChange={() => handleNotifChange("nothing")}
            >
              {t("channels.nothing")}
            </DropdownMenuCheckboxItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Admin-only options */}
        {isAdmin && (
          <>
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5 me-2" />
              {t("channels.edit")}
            </DropdownMenuItem>
            {ch.is_private && (
              <DropdownMenuItem onClick={onManageMembers}>
                <Users className="h-3.5 w-3.5 me-2" />
                {t("channels.manageMembers")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-destructive" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 me-2" />
              {t("channels.delete")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

function VoiceChannelTimer({ participants }: { participants: VoiceParticipant[] }) {
  const oldest = participants.length > 0
    ? participants.reduce<string | null>((min, p) => {
        if (!p.joined_at) return min;
        return !min || p.joined_at < min ? p.joined_at : min;
      }, null)
    : null;
  const timer = useVoiceTimer(oldest);
  if (!timer) return null;
  return <span className="ml-auto text-[10px] font-mono text-green-500 shrink-0">{timer}</span>;
}

const ChannelSidebar = ({ serverId, activeChannelId, onChannelSelect, onVoiceChannelSelect, activeVoiceChannelId }: Props) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { globalMuted, globalDeafened, toggleGlobalMute, toggleGlobalDeafen } = useAudioSettings();
  const { voiceChannel, disconnectVoice, isScreenSharing, setIsScreenSharing, remoteScreenStream, setRemoteScreenStream, setScreenSharerName, isCameraOn, setIsWatchingStream, nativeResolutionLabel, remoteScreenStreams, localScreenStream, localStreamingApp, localStreamStartedAt } = useVoiceChannel();
  const { getUserStatus } = usePresence();
  const isMobile = useIsMobile();
  const { pendingMode, consumeRequest } = useCreateChannel();
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
  const [isRules, setIsRules] = useState(false);
  const [supportRoleIds, setSupportRoleIds] = useState<string[]>([]);
  const [serverRoles, setServerRoles] = useState<{ id: string; name: string; color: string }[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [serverMembers, setServerMembers] = useState<ServerMember[]>([]);
  const [voiceParticipants, setVoiceParticipants] = useState<Map<string, VoiceParticipant[]>>(new Map());
  const [currentUserRole, setCurrentUserRole] = useState<string>("member");
  const [goLiveOpen, setGoLiveOpen] = useState(false);
  const [streamCardOpen, setStreamCardOpen] = useState<string | null>(null);
  const skipRealtimeReloadRef = useRef(false);

  // Listen for "open-go-live" event from UserPanel share-screen button
  useEffect(() => {
    const handler = () => setGoLiveOpen(true);
    window.addEventListener("open-go-live", handler);
    return () => window.removeEventListener("open-go-live", handler);
  }, []);

  // Listen for "open-edit-channel" event from ChatWelcome banner button
  useEffect(() => {
    const handler = (e: Event) => {
      const ch = channels.find(c => c.id === (e as CustomEvent).detail.channelId);
      if (ch) openEditDialog(ch);
    };
    window.addEventListener("open-edit-channel", handler);
    return () => window.removeEventListener("open-edit-channel", handler);
  }, [channels]);
  // speakingUsers state removed — now driven by p.is_speaking from DB

  // Edit/Delete/Manage members state
  const [editOpen, setEditOpen] = useState(false);
  const [editChannel, setEditChannel] = useState<Channel | null>(null);
  const [editName, setEditName] = useState("");
  const [editIsPrivate, setEditIsPrivate] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editRestrictedPermissions, setEditRestrictedPermissions] = useState<string[]>([]);
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
  const [dragType, setDragType] = useState<"channel" | "section" | "participant" | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [dragParticipantFrom, setDragParticipantFrom] = useState<string | null>(null);

  // Soundboard
  const [serverSounds, setServerSounds] = useState<{ id: string; name: string; url: string }[]>([]);
  const [soundboardOpen, setSoundboardOpen] = useState(false);

  // React to external create channel/section requests from context (e.g. ServerRail context menu)
  useEffect(() => {
    if (!pendingMode) return;
    const mode = consumeRequest();
    if (mode === "section") {
      setUseCustomCategory(true);
      setCustomCategory("");
      setNewCategory("");
      setCreateOpen(true);
    } else if (mode === "channel") {
      setUseCustomCategory(false);
      setCreateOpen(true);
    }
  }, [pendingMode, consumeRequest]);

  // Fetch server roles for support channel creation
  const fetchServerRoles = useCallback(async () => {
    const { data } = await supabase
      .from("server_roles" as any)
      .select("id, name, color")
      .eq("server_id", serverId)
      .order("position");
    setServerRoles((data as any[]) || []);
  }, [serverId]);

  useEffect(() => {
    if (newType === "support" && serverRoles.length === 0) {
      fetchServerRoles();
    }
  }, [newType, fetchServerRoles, serverRoles.length]);

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

  const { permissions } = useServerPermissions(serverId);
  const canManageChannel = permissions.manage_channel;
  const canOpenSettings = permissions.manage_server || permissions.manage_roles || permissions.create_expressions || permissions.view_audit_log;
  // Legacy alias kept for ChannelDropdown prop name
  const isAdmin = canManageChannel;

  const textChannelIds = useMemo(() => channels.filter((c) => c.type === "text").map((c) => c.id), [channels]);
  const unreadSet = useChannelUnread(textChannelIds);
  useEffect(() => {
    let isActive = true;
    let pollTimeout: ReturnType<typeof setTimeout> | null = null;
    let pollInterval = 2000;

    const load = async () => {
      const [{ data: s }, { data: ch }] = await Promise.all([
        supabase.from("servers" as any).select("*").eq("id", serverId).maybeSingle(),
        supabase.from("channels" as any).select("*").eq("server_id", serverId).order("position"),
      ]);

      if (!isActive) return;

      setServer(s as any);
      setChannels((ch as any) || []);
      setChannelsLoading(false);

      if (user) {
        const { data: memberData } = await supabase
          .from("server_members" as any)
          .select("role")
          .eq("server_id", serverId)
          .eq("user_id", user.id)
          .maybeSingle();
        if (!isActive) return;
        if (memberData) setCurrentUserRole((memberData as any).role);
      }
    };

    const schedulePoll = () => {
      pollTimeout = setTimeout(async () => {
        try {
          await load();
          pollInterval = Math.min(Math.floor(pollInterval * 1.5), 30000);
        } finally {
          if (isActive) schedulePoll();
        }
      }, pollInterval);
    };

    load();

    const channel = supabase
      .channel(`channels-${serverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "channels", filter: `server_id=eq.${serverId}` }, () => {
        if (skipRealtimeReloadRef.current) return;
        pollInterval = 2000;
        load();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "servers", filter: `id=eq.${serverId}` }, (payload) => {
        setServer(payload.new as any);
      })
      .subscribe();

    schedulePoll();

    return () => {
      isActive = false;
      if (pollTimeout) clearTimeout(pollTimeout);
      channel.unsubscribe();
    };
  }, [serverId, user?.id]);

  // Realtime: soundboard changes
  useEffect(() => {
    if (!voiceChannel?.serverId) return;
    const channel = supabase
      .channel(`soundboard-${voiceChannel.serverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_soundboard", filter: `server_id=eq.${voiceChannel.serverId}` }, () => {
        supabase
          .from("server_soundboard" as any)
          .select("id, name, url")
          .eq("server_id", voiceChannel.serverId)
          .order("created_at")
          .then(({ data }) => setServerSounds((data as any[]) || []));
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [voiceChannel?.serverId]);

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
      .select("user_id, display_name, username, avatar_url, name_font, name_effect, name_gradient_start, name_gradient_end")
      .in("user_id", userIds);
    setServerMembers((profiles || []) as ServerMember[]);
  }, [serverId, user?.id]);

  const fetchVoiceParticipants = useCallback(async () => {
    const voiceChannelIds = channels.filter((c) => c.type === "voice").map((c) => c.id);
    if (voiceChannelIds.length === 0) { setVoiceParticipants(new Map()); return; }

    const { data } = await supabase
      .from("voice_channel_participants")
      .select("channel_id, user_id, is_speaking, is_muted, is_deafened, is_screen_sharing, server_muted, server_deafened, joined_at")
      .in("channel_id", voiceChannelIds);
    if (!data || data.length === 0) { setVoiceParticipants(new Map()); return; }

    const userIds = [...new Set(data.map((d) => d.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, name_font, name_effect, name_gradient_start, name_gradient_end")
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
        server_muted: !!(d as any).server_muted,
        server_deafened: !!(d as any).server_deafened,
        name_font: (p as any)?.name_font || null,
        name_effect: (p as any)?.name_effect || null,
        name_gradient_start: (p as any)?.name_gradient_start || null,
        name_gradient_end: (p as any)?.name_gradient_end || null,
        joined_at: (d as any).joined_at ?? null,
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
      is_private: newType === "support" ? false : isPrivate,
      is_announcement: newType === "text" ? isAnnouncement : false,
      is_rules: newType === "text" ? isRules : false,
      ...(newType === "support" ? { support_role_ids: supportRoleIds } : {}),
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
    setIsRules(false);
    setSupportRoleIds([]);
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
    setEditDescription((ch as any).description ?? "");
    setEditRestrictedPermissions(ch.restricted_permissions || []);
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
    await supabase.from("channels" as any).update({ name, is_private: editIsPrivate, description: editDescription || null, restricted_permissions: editRestrictedPermissions } as any).eq("id", editChannel.id);

    if (!editIsPrivate && editChannel.is_private) {
      // Switched from private to public — remove all channel_members
      await supabase.from("channel_members" as any).delete().eq("channel_id", editChannel.id);
    } else if (editIsPrivate) {
      // Sync members
      await syncChannelMembers(editChannel.id, editMembers);
    }

    // Immediately update local state so the edit dialog and header reflect the change
    const updatedDescription = editDescription || null;
    setChannels(prev =>
      prev.map(ch =>
        ch.id === editChannel.id
          ? { ...ch, name, is_private: editIsPrivate, description: updatedDescription } as any
          : ch
      )
    );
    window.dispatchEvent(new CustomEvent("channel-description-updated", {
      detail: { channelId: editChannel.id, description: updatedDescription },
    }));

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
    e.dataTransfer.setData("text/plain", "channel-drag");
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    }
  };

  const handleDragEnd = () => {
    setDragItem(null);
    setDragType(null);
    setDragOverTarget(null);
    setDragParticipantFrom(null);
  };

  const handleParticipantDragStart = (e: React.DragEvent, userId: string, fromChannelId: string) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/json", JSON.stringify({ userId, fromChannelId }));
    e.dataTransfer.setData("text/plain", "participant-drag");
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    }
    setDragItem(userId);
    setDragType("participant");
    setDragParticipantFrom(fromChannelId);
  };

  const handleVoiceChannelDragOver = (e: React.DragEvent, targetChannelId: string) => {
    if (dragType !== "participant") return;
    if (targetChannelId === dragParticipantFrom) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverTarget(targetChannelId);
  };

  const handleParticipantDrop = async (e: React.DragEvent, targetChannelId: string, targetChannelName: string) => {
    e.preventDefault();
    if (dragType !== "participant" || !dragItem || !dragParticipantFrom) { handleDragEnd(); return; }
    if (targetChannelId === dragParticipantFrom) { handleDragEnd(); return; }
    const userId = dragItem;
    const fromChannelId = dragParticipantFrom;
    handleDragEnd();
    try {
      console.log("📥 DROP FIRED, Data:", JSON.parse(e.dataTransfer.getData("application/json")));
    } catch { /* dataTransfer may be unavailable after drop */ }
    console.log("🚀 FIRING RPC move_voice_user with params:", { p_from_channel_id: fromChannelId, p_user_id: userId, p_to_channel_id: targetChannelId });
    try {
      const { data, error } = await supabase.rpc("move_voice_user" as any, {
        p_from_channel_id: fromChannelId,
        p_user_id: userId,
        p_to_channel_id: targetChannelId,
        p_to_channel_name: targetChannelName,
      } as any);
      console.log("🛠️ RPC RETURN DATA:", data);
      if (error) {
        toast({ title: t("common.error"), description: error.message, variant: "destructive" });
      }
    } catch (err) {
      console.error("❌ move_voice_user threw:", err);
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    }
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

    const prevChannels = [...channels];
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

    // Suppress realtime reload while persisting
    skipRealtimeReloadRef.current = true;
    const timer = setTimeout(() => { skipRealtimeReloadRef.current = false; }, 2000);

    try {
      await Promise.all(updated.map(ch =>
        supabase.from("channels" as any).update({ position: ch.position, category: ch.category } as any).eq("id", ch.id)
      ));
    } catch (err) {
      setChannels(prevChannels);
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    } finally {
      clearTimeout(timer);
      setTimeout(() => { skipRealtimeReloadRef.current = false; }, 500);
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

    const prevChannels = [...channels];
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

    // Suppress realtime reload while persisting
    skipRealtimeReloadRef.current = true;
    const timer = setTimeout(() => { skipRealtimeReloadRef.current = false; }, 2000);

    try {
      await Promise.all(updated.map(ch =>
        supabase.from("channels" as any).update({ position: ch.position } as any).eq("id", ch.id)
      ));
    } catch (err) {
      setChannels(prevChannels);
      toast({ title: t("common.error"), description: String(err), variant: "destructive" });
    } finally {
      clearTimeout(timer);
      setTimeout(() => { skipRealtimeReloadRef.current = false; }, 500);
    }
  };

  const renderAdminDropdown = (ch: Channel) => (
    <ChannelDropdown
      ch={ch}
      isAdmin={isAdmin}
      onEdit={() => openEditDialog(ch)}
      onManageMembers={() => openManageMembers(ch)}
      onDelete={() => setDeleteChannelId(ch.id)}
    />
  );

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
              <StyledDisplayName displayName={m.display_name || m.username || "User"} fontStyle={m.name_font} effect={m.name_effect} gradientStart={m.name_gradient_start} gradientEnd={m.name_gradient_end} className="text-sm truncate" />
            </label>
          ))
        )}
      </ScrollArea>
    </div>
  );

  return (
    <>
      <div className="w-[303px] max-md:w-full max-md:max-w-full h-full flex flex-col border-e border-sidebar-border shrink-0 max-md:shrink max-md:min-w-0 overflow-hidden">
        {server?.banner_url && (server.boost_level ?? 0) >= 1 && (
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
                className="inline-flex items-center gap-1 shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded leading-none whitespace-nowrap text-white"
                style={{ backgroundColor: server.server_tag_container_color || server.server_tag_color || "#5865f2" }}
              >
                <ServerTagBadgeIcon badgeName={server.server_tag_badge} color={server.server_tag_color || undefined} className="h-3 w-3" />
                {server.server_tag_name.substring(0, 4).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setInviteModalOpen(true)} title={t("servers.copyInvite")}>
              <Link className="h-3.5 w-3.5" />
            </Button>
            {canOpenSettings && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSettingsOpen(true)} title={t("servers.settings")}>
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4 pb-16">
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
                        <span className="text-[11px] font-extrabold uppercase text-muted-foreground tracking-wider truncate">{category}</span>
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
                      const ChannelIcon = ch.is_private && ch.type !== "ticket" ? Lock : ch.type === "support" ? LifeBuoy : ch.type === "ticket" ? Ticket : ch.type === "voice" ? Volume2 : ch.is_rules ? BookOpen : ch.is_announcement ? Megaphone : Hash;

                      if (ch.type === "voice") {
                        const participants = voiceParticipants.get(ch.id) || [];
                        const hasParticipants = participants.length > 0;
                        const localIsConnecting =
                          !!voiceChannel &&
                          voiceChannel.id === ch.id &&
                          !participants.some((p) => p.user_id === user?.id);
                        return (
                          <div key={ch.id}>
                            {dragOverTarget === ch.id && dragType === "channel" && <div className="h-0.5 bg-primary rounded-full mx-2" />}
                            <div
                              className={`group flex items-center ${dragItem === ch.id ? 'opacity-50' : ''} ${dragType === "participant" && dragOverTarget === ch.id && dragParticipantFrom !== ch.id ? "ring-1 ring-primary/60 bg-primary/10 rounded-md" : ""}`}
                              draggable={isAdmin}
                              onDragStart={(e) => { e.stopPropagation(); handleDragStart(e, ch.id, "channel"); }}
                              onDragEnd={handleDragEnd}
                              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (dragType === "participant") handleVoiceChannelDragOver(e, ch.id);
                                else handleChannelDragOver(e, ch.id);
                              }}
                              onDrop={(e) => { if (dragType === "participant") handleParticipantDrop(e, ch.id, ch.name); else handleChannelDrop(e, ch.id, category); }}
                            >
                              <button
                                onClick={() => onVoiceChannelSelect?.({ id: ch.id, name: ch.name, restricted_permissions: ch.restricted_permissions })}
                                className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-sidebar-accent/50 ${hasParticipants
                                    ? "font-bold text-white"
                                    : "font-medium text-[#949BA4] hover:text-[#DBDEE1]"
                                  }`}
                              >
                                <ChannelIcon className={`h-4 w-4 shrink-0 ${hasParticipants && !ch.is_private ? "text-green-500" : ""}`} />
                                <span className="truncate">{ch.name}</span>
                                <VoiceChannelTimer participants={participants} />
                              </button>
                              {renderAdminDropdown(ch)}
                            </div>
                            {localIsConnecting && user && (
                              <div className="relative flex items-center gap-2 ps-8 py-1.5 text-xs font-medium text-muted-foreground opacity-50 animate-pulse pointer-events-none">
                                <div className="relative shrink-0">
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={profile?.avatar_url || ""} />
                                    <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                                      {(profile?.display_name || profile?.username || user.email || "U").charAt(0).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                                <span className="truncate">
                                  {profile?.display_name || profile?.username || user.email?.split("@")[0] || "Connecting…"}
                                </span>
                              </div>
                            )}
                            {participants.map((p) => {
                              const isScreenSharer = p.is_screen_sharing;

                              const innerRow = (
                                <div
                                  className={`relative group flex items-center gap-2 ps-8 py-1.5 text-xs font-medium text-muted-foreground transition-opacity duration-300 ${permissions.move_members && p.user_id !== user?.id ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
                                  draggable={permissions.move_members && p.user_id !== user?.id}
                                  onDragStart={(e) => handleParticipantDragStart(e, p.user_id, ch.id)}
                                  onDragEnd={handleDragEnd}
                                >
                                  <div className="relative shrink-0">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={p.avatar_url || ""} />
                                      <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                                        {(p.display_name || p.username || "U").charAt(0).toUpperCase()}
                                      </AvatarFallback>
                                    </Avatar>
                                  </div>
                                  <StyledDisplayName displayName={p.display_name || p.username || "User"} fontStyle={p.name_font} effect={p.name_effect} gradientStart={p.name_gradient_start} gradientEnd={p.name_gradient_end} className="truncate" />
                                  {(p.is_deafened || p.server_deafened) ? (
                                    <HeadphoneOff className="h-3 w-3 text-destructive shrink-0" />
                                  ) : (p.is_muted || p.server_muted) ? (
                                    <MicOff className="h-3 w-3 text-destructive shrink-0" />
                                  ) : p.is_speaking ? (
                                    <Mic className="h-3 w-3 text-[#00db21] shrink-0 animate-pulse" />
                                  ) : null}
                                  {p.is_screen_sharing && (
                                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">LIVE</span>
                                  )}
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
                                  <div className="relative group flex items-center gap-2 ps-8 py-1.5 text-xs font-medium text-muted-foreground cursor-pointer">
                                    <div className="relative shrink-0">
                                      <Avatar className="h-5 w-5">
                                        <AvatarImage src={p.avatar_url || ""} />
                                        <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                                          {(p.display_name || p.username || "U").charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                      </Avatar>
                                    </div>
                                    <StyledDisplayName displayName={p.display_name || p.username || "User"} fontStyle={p.name_font} effect={p.name_effect} gradientStart={p.name_gradient_start} gradientEnd={p.name_gradient_end} className="truncate" />
                                    {(p.is_deafened || p.server_deafened) ? (
                                      <HeadphoneOff className="h-3 w-3 text-destructive shrink-0" />
                                    ) : (p.is_muted || p.server_muted) ? (
                                      <MicOff className="h-3 w-3 text-destructive shrink-0" />
                                    ) : p.is_speaking ? (
                                      <Mic className="h-3 w-3 text-[#00db21] shrink-0 animate-pulse" />
                                    ) : null}
                                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">LIVE</span>
                                  </div>
                                );
                                return (
                                  <HoverCard
                                    key={p.user_id}
                                    openDelay={250}
                                    closeDelay={200}
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
                                      voiceChannels={channels.filter(c => c.type === "voice").map(c => ({ id: c.id, name: c.name }))}
                                    >
                                      <HoverCardTrigger asChild>
                                        {clickableRow}
                                      </HoverCardTrigger>
                                    </VoiceUserContextMenu>
                                    <HoverCardContent side="right" align="start" sideOffset={8} className="w-[280px] p-0 overflow-hidden rounded-lg bg-[#1a1a1f]">
                                      {(() => {
                                        const isLocal = p.user_id === user?.id;
                                        const remoteInfo = remoteScreenStreams.find(s => s.identity === p.user_id);
                                        const userStream = isLocal ? localScreenStream : (remoteInfo?.stream ?? remoteScreenStream);
                                        const appName = isLocal ? localStreamingApp : (remoteInfo?.streamingApp ?? null);
                                        const startedAt = isLocal ? localStreamStartedAt : (remoteInfo?.streamStartedAt ?? null);
                                        return (
                                          <StreamPreviewCard
                                            stream={userStream ?? null}
                                            streamingApp={appName}
                                            streamStartedAt={startedAt}
                                            participantName={p.display_name || p.username || "User"}
                                            nameFont={p.name_font}
                                            nameEffect={p.name_effect}
                                            nameGradientStart={p.name_gradient_start}
                                            nameGradientEnd={p.name_gradient_end}
                                            onWatch={() => { setIsWatchingStream(true); setStreamCardOpen(null); }}
                                          />
                                        );
                                      })()}
                                    </HoverCardContent>
                                  </HoverCard>
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
                                  voiceChannels={channels.filter(c => c.type === "voice").map(c => ({ id: c.id, name: c.name }))}
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
                              draggable={false}
                              to={`/server/${serverId}/channel/${ch.id}`}
                              onClick={() => onChannelSelect?.({ id: ch.id, name: ch.name, type: ch.type, is_private: ch.is_private, is_announcement: ch.is_announcement, is_rules: ch.is_rules, description: (ch as any).description ?? null })}
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

      </div>

      {/* Go Live Modal */}
      <GoLiveModal
        open={goLiveOpen}
        onOpenChange={setGoLiveOpen}
        boostLevel={server?.boost_level ?? 0}
        onGoLive={(settings) => {
          setGoLiveOpen(false);
          window.dispatchEvent(new CustomEvent("start-screen-share", { detail: settings }));
        }}
      />

      {/* Create Channel Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) { setIsPrivate(false); setIsAnnouncement(false); setIsRules(false); setSupportRoleIds([]); setSelectedMembers([]); setUseCustomCategory(false); setCustomCategory(""); }
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
            <Select value={newType} onValueChange={(val) => { if (val === "support" && !server?.is_community) return; setNewType(val); if (val === "support") { setIsAnnouncement(false); setIsRules(false); setIsPrivate(false); } }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">{t("channels.text")}</SelectItem>
                <SelectItem value="voice">{t("channels.voice")}</SelectItem>
                <SelectItem value="support" disabled={!server?.is_community}>
                  <span className="flex items-center gap-2">
                    {t("channels.support")}
                    {!server?.is_community && <Lock className="h-3 w-3 text-muted-foreground" />}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            {!server?.is_community && newType === "text" && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Lock className="h-3 w-3 shrink-0" />
                {t("channels.communityOnly")}
              </p>
            )}

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
              <>
                <div className={`flex items-center justify-between rounded-lg border border-border/50 p-3 ${!server?.is_community ? 'opacity-50' : ''}`}>
                  <div className="space-y-0.5">
                    <Label htmlFor="announcement-toggle" className="text-sm font-medium flex items-center gap-1.5">
                      {t("channels.announcement")}
                      {!server?.is_community && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </Label>
                    <p className="text-xs text-muted-foreground">{t("channels.announcementDesc")}</p>
                  </div>
                  <Switch
                    id="announcement-toggle"
                    checked={isAnnouncement}
                    onCheckedChange={(checked) => { setIsAnnouncement(checked); if (checked) setIsRules(false); }}
                    disabled={!server?.is_community}
                  />
                </div>
                <div className={`flex items-center justify-between rounded-lg border border-border/50 p-3 ${!server?.is_community ? 'opacity-50' : ''}`}>
                  <div className="space-y-0.5">
                    <Label htmlFor="rules-toggle" className="text-sm font-medium flex items-center gap-1.5">
                      {t("channels.rules")}
                      {!server?.is_community && <Lock className="h-3 w-3 text-muted-foreground" />}
                    </Label>
                    <p className="text-xs text-muted-foreground">{t("channels.rulesDesc")}</p>
                  </div>
                  <Switch
                    id="rules-toggle"
                    checked={isRules}
                    onCheckedChange={(checked) => { setIsRules(checked); if (checked) setIsAnnouncement(false); }}
                    disabled={!server?.is_community}
                  />
                </div>
              </>
            )}

            {newType === "support" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("channels.selectSupportRoles")}</Label>
                <p className="text-xs text-muted-foreground">{t("channels.supportDesc")}</p>
                <ScrollArea className="h-[160px] border border-border rounded-md p-2">
                  {serverRoles.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">{t("common.loading")}</p>
                  ) : (
                    serverRoles.map((role) => (
                      <label key={role.id} className="flex items-center gap-3 py-1.5 px-1 rounded hover:bg-muted/50 cursor-pointer">
                        <Checkbox
                          checked={supportRoleIds.includes(role.id)}
                          onCheckedChange={() => {
                            setSupportRoleIds((prev) =>
                              prev.includes(role.id) ? prev.filter((id) => id !== role.id) : [...prev, role.id]
                            );
                          }}
                        />
                        <span className="text-sm font-medium" style={{ color: role.color || undefined }}>{role.name}</span>
                      </label>
                    ))
                  )}
                </ScrollArea>
              </div>
            )}

            <Button onClick={handleCreateChannel} disabled={!newName.trim()} className="w-full">
              {t("channels.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Channel — Full-Screen Overlay */}
      {editOpen && editChannel && (
        <ChannelSettingsOverlay
          channel={{
            id: editChannel.id,
            name: editChannel.name,
            type: editChannel.type,
            is_private: editChannel.is_private,
            description: (editChannel as any).description ?? null,
            restricted_permissions: editChannel.restricted_permissions ?? [],
            user_limit: (editChannel as any).user_limit ?? 0,
          }}
          serverId={serverId}
          serverMembers={serverMembers.map(m => ({ id: m.user_id, username: m.username ?? undefined, name: m.display_name || m.username || "User", avatar_url: m.avatar_url ?? undefined }))}
          onClose={() => { setEditOpen(false); setEditChannel(null); }}
          onSave={async (updates) => {
            await supabase.from("channels" as any).update(updates as any).eq("id", editChannel.id);
            if (!updates.is_private && editChannel.is_private) {
              await supabase.from("channel_members" as any).delete().eq("channel_id", editChannel.id);
            } else if (updates.is_private) {
              await syncChannelMembers(editChannel.id, editMembers);
            }
            setChannels(prev => prev.map(ch =>
              ch.id === editChannel.id ? { ...ch, ...updates } as any : ch
            ));
            window.dispatchEvent(new CustomEvent("channel-description-updated", {
              detail: { channelId: editChannel.id, description: updates.description },
            }));
            toast({ title: t("channels.updated") });
            setEditOpen(false);
            setEditChannel(null);
          }}
          onDelete={() => {
            setEditOpen(false);
            setDeleteChannelId(editChannel.id);
            setEditChannel(null);
          }}
        />
      )}

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
