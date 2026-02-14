import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Hash, Volume2, Plus, Copy, Settings, LogOut, Lock, MoreVertical, Pencil, Trash2, Users, Mic, MicOff, Headphones, HeadphoneOff, PhoneOff } from "lucide-react";
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
import ServerSettingsDialog from "./ServerSettingsDialog";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { usePresence } from "@/hooks/usePresence";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import { NavLink as RouterNavLink } from "react-router-dom";

interface Channel {
  id: string;
  name: string;
  type: string;
  category: string;
  position: number;
  is_private: boolean;
}

interface Server {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  icon_url: string | null;
  banner_url: string | null;
}

interface VoiceParticipant {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
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
  onChannelSelect?: (channel: { id: string; name: string; type: string; is_private?: boolean }) => void;
  onVoiceChannelSelect?: (channel: { id: string; name: string }) => void;
  activeVoiceChannelId?: string;
}

const ChannelSidebar = ({ serverId, activeChannelId, onChannelSelect, onVoiceChannelSelect, activeVoiceChannelId }: Props) => {
  const { t } = useTranslation();
  const { user, profile } = useAuth();
  const { globalMuted, globalDeafened, toggleGlobalMute, toggleGlobalDeafen } = useAudioSettings();
  const { voiceChannel, disconnectVoice } = useVoiceChannel();
  const { getUserStatus } = usePresence();
  const status = (getUserStatus(profile) || "online") as UserStatus;
  const [server, setServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [newCategory, setNewCategory] = useState("Text Channels");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [serverMembers, setServerMembers] = useState<ServerMember[]>([]);
  const [voiceParticipants, setVoiceParticipants] = useState<Map<string, VoiceParticipant[]>>(new Map());
  const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());

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

  const isAdmin = server?.owner_id === user?.id;

  useEffect(() => {
    const load = async () => {
      const { data: s } = await supabase.from("servers" as any).select("*").eq("id", serverId).maybeSingle();
      setServer(s as any);
      const { data: ch } = await supabase.from("channels" as any).select("*").eq("server_id", serverId).order("position");
      setChannels((ch as any) || []);
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
      .select("channel_id, user_id")
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

  // Subscribe to speaking broadcasts from voice channels
  useEffect(() => {
    const voiceChannelIds = channels.filter((c) => c.type === "voice").map((c) => c.id);
    if (voiceChannelIds.length === 0) return;

    const subs = voiceChannelIds.map((chId) => {
      return supabase
        .channel(`voice-speaking-listen-${chId}`)
        .on("broadcast", { event: "voice-speaking" }, ({ payload }) => {
          if (!payload) return;
          setSpeakingUsers((prev) => {
            const next = new Set(prev);
            if (payload.isSpeaking) next.add(payload.userId);
            else next.delete(payload.userId);
            return next;
          });
        })
        .subscribe();
    });

    return () => { subs.forEach((s) => s.unsubscribe()); };
  }, [channels]);

  const handleCreateChannel = async () => {
    if (!newName.trim()) return;
    const { data: newChannel } = await supabase.from("channels" as any).insert({
      server_id: serverId,
      name: newName.trim().toLowerCase().replace(/\s+/g, "-"),
      type: newType,
      category: newCategory,
      is_private: isPrivate,
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

    setNewName("");
    setIsPrivate(false);
    setSelectedMembers([]);
    setCreateOpen(false);
  };

  const copyInvite = () => {
    if (server?.invite_code) {
      navigator.clipboard.writeText(server.invite_code);
      toast({ title: t("servers.copiedInvite") });
    }
  };

  const leaveServer = async () => {
    if (!user) return;
    await supabase.from("server_members" as any).delete().eq("server_id", serverId).eq("user_id", user.id);
    window.location.href = "/";
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
      <div className="w-[240px] flex flex-col bg-sidebar-background border-e border-sidebar-border shrink-0 overflow-hidden">
        <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
          <h2 className="font-bold text-sm truncate">{server?.name || "..."}</h2>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyInvite} title={t("servers.copyInvite")}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {isAdmin && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSettingsOpen(true)} title={t("servers.settings")}>
                <Settings className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {Object.entries(grouped).map(([category, chs]) => (
            <div key={category}>
              <div className="flex items-center justify-between px-1 mb-1">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground tracking-wide">{category}</span>
                {isAdmin && (
                  <button
                    onClick={() => { setNewCategory(category); setNewType(category.toLowerCase().includes("voice") ? "voice" : "text"); setCreateOpen(true); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {chs.map((ch) => {
                const ChannelIcon = ch.is_private ? Lock : (ch.type === "voice" ? Volume2 : Hash);

                if (ch.type === "voice") {
                  const participants = voiceParticipants.get(ch.id) || [];
                  const hasParticipants = participants.length > 0;
                  return (
                    <div key={ch.id}>
                      <div className="group flex items-center">
                        <button
                          onClick={() => onVoiceChannelSelect?.({ id: ch.id, name: ch.name })}
                          className="flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                        >
                          <ChannelIcon className={`h-4 w-4 shrink-0 ${hasParticipants && !ch.is_private ? "text-green-500" : ""}`} />
                          <span className="truncate">{ch.name}</span>
                        </button>
                        {renderAdminDropdown(ch)}
                      </div>
                      {participants.map((p) => (
                        <div key={p.user_id} className="flex items-center gap-2 ps-8 py-1 text-xs text-muted-foreground">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={p.avatar_url || ""} />
                            <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                              {(p.display_name || p.username || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{p.display_name || p.username || "User"}</span>
                          {speakingUsers.has(p.user_id) && (
                            <Mic className="h-3 w-3 text-[#00db21] shrink-0 animate-pulse" />
                          )}
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <div key={ch.id} className="group flex items-center">
                    <NavLink
                      to={`/server/${serverId}/channel/${ch.id}`}
                      onClick={() => onChannelSelect?.({ id: ch.id, name: ch.name, type: ch.type, is_private: ch.is_private })}
                      className={({ isActive }) =>
                        `flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                          isActive || ch.id === activeChannelId
                            ? "bg-sidebar-accent text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                        }`
                      }
                    >
                      <ChannelIcon className="h-4 w-4 shrink-0" />
                      <span className="truncate">{ch.name}</span>
                    </NavLink>
                    {renderAdminDropdown(ch)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* User Panel */}
        <div className="border-t border-sidebar-border">
          {/* Voice connection status */}
          {voiceChannel && (
            <div className="flex items-center gap-2 px-3 py-2 bg-sidebar-accent/50">
              <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
              <span className="text-xs font-medium truncate flex-1">#{voiceChannel.name}</span>
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
            <RouterNavLink to="/settings">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title={t("nav.settings")}>
                <Settings className="h-4 w-4" />
              </Button>
            </RouterNavLink>
            {!isAdmin && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive hover:bg-destructive/10 ms-auto" onClick={leaveServer} title={t("servers.leave")}>
                <LogOut className="h-4 w-4" />
              </Button>
            )}
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

      {/* Create Channel Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => {
        setCreateOpen(open);
        if (!open) { setIsPrivate(false); setSelectedMembers([]); }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("channels.create")}</DialogTitle>
            <DialogDescription>{t("channels.createDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={t("channels.namePlaceholder")}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateChannel()}
            />
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
    </>
  );
};

export default ChannelSidebar;
