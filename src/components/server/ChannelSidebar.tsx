import React, { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Hash, Volume2, Plus, Copy, Settings, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import ServerSettingsDialog from "./ServerSettingsDialog";

interface Channel {
  id: string;
  name: string;
  type: string;
  category: string;
  position: number;
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

interface Props {
  serverId: string;
  activeChannelId?: string;
  onChannelSelect?: (channel: { id: string; name: string; type: string }) => void;
  onVoiceChannelSelect?: (channel: { id: string; name: string }) => void;
  activeVoiceChannelId?: string;
}

const ChannelSidebar = ({ serverId, activeChannelId, onChannelSelect, onVoiceChannelSelect, activeVoiceChannelId }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [server, setServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("text");
  const [newCategory, setNewCategory] = useState("Text Channels");
  const [voiceParticipants, setVoiceParticipants] = useState<Map<string, VoiceParticipant[]>>(new Map());

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

  // Fetch voice participants
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

  // Realtime for voice participants
  useEffect(() => {
    if (channels.filter((c) => c.type === "voice").length === 0) return;
    const sub = supabase
      .channel(`voice-sidebar-${serverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_channel_participants" }, () => fetchVoiceParticipants())
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [serverId, fetchVoiceParticipants]);

  const handleCreateChannel = async () => {
    if (!newName.trim()) return;
    await supabase.from("channels" as any).insert({
      server_id: serverId,
      name: newName.trim().toLowerCase().replace(/\s+/g, "-"),
      type: newType,
      category: newCategory,
    } as any);
    setNewName("");
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

  const grouped = channels.reduce<Record<string, Channel[]>>((acc, ch) => {
    (acc[ch.category] = acc[ch.category] || []).push(ch);
    return acc;
  }, {});

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
                if (ch.type === "voice") {
                  const participants = voiceParticipants.get(ch.id) || [];
                  const hasParticipants = participants.length > 0;
                  return (
                    <div key={ch.id}>
                      <button
                        onClick={() => onVoiceChannelSelect?.({ id: ch.id, name: ch.name })}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                          ch.id === activeVoiceChannelId
                            ? "bg-sidebar-accent text-foreground font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                        }`}
                      >
                        <Volume2 className={`h-4 w-4 shrink-0 ${hasParticipants ? "text-green-500" : ""}`} />
                        <span className="truncate">{ch.name}</span>
                      </button>
                      {participants.map((p) => (
                        <div key={p.user_id} className="flex items-center gap-2 ps-8 py-1 text-xs text-muted-foreground">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={p.avatar_url || ""} />
                            <AvatarFallback className="text-[8px] bg-primary/20 text-primary">
                              {(p.display_name || p.username || "U").charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{p.display_name || p.username || "User"}</span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return (
                  <NavLink
                    key={ch.id}
                    to={`/server/${serverId}/channel/${ch.id}`}
                    onClick={() => onChannelSelect?.({ id: ch.id, name: ch.name, type: ch.type })}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                        isActive || ch.id === activeChannelId
                          ? "bg-sidebar-accent text-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50"
                      }`
                    }
                  >
                    <Hash className="h-4 w-4 shrink-0" />
                    <span className="truncate">{ch.name}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </div>

        <div className="p-2 border-t border-sidebar-border flex gap-1">
          {!isAdmin && (
            <Button variant="ghost" size="sm" className="flex-1 text-xs text-destructive" onClick={leaveServer}>
              <LogOut className="h-3.5 w-3.5 me-1" />
              {t("servers.leave")}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
            <Button onClick={handleCreateChannel} disabled={!newName.trim()} className="w-full">
              {t("channels.create")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <ServerSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} serverId={serverId} />
    </>
  );
};

export default ChannelSidebar;
