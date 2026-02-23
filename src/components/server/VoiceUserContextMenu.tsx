import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useVoiceChannel } from "@/contexts/VoiceChannelContext";
import { User, MessageSquare, Phone, Volume2, VolumeX, UserPlus, UserMinus, PhoneOff, ClipboardCopy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import StyledDisplayName from "@/components/StyledDisplayName";
import { format } from "date-fns";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuLabel,
} from "@/components/ui/context-menu";

interface VoiceUserContextMenuProps {
  children: React.ReactNode;
  targetUserId: string;
  targetUsername?: string;
  serverId: string;
  channelId: string;
  serverOwnerId: string;
  currentUserRole?: string;
}

const roleBadgeColors: Record<string, string> = {
  owner: "bg-green-600 text-white hover:bg-green-600",
  admin: "bg-blue-600 text-white hover:bg-blue-600",
  member: "bg-muted text-muted-foreground hover:bg-muted",
};

const VoiceUserContextMenu = ({
  children,
  targetUserId,
  targetUsername,
  serverId,
  channelId,
  serverOwnerId,
  currentUserRole,
}: VoiceUserContextMenuProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { userVolumes, setUserVolume } = useVoiceChannel();
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [memberData, setMemberData] = useState<any>(null);

  const isSelf = user?.id === targetUserId;
  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin";
  const volume = userVolumes[targetUserId] ?? 100;

  useEffect(() => {
    if (!user || isSelf) return;
    (async () => {
      const { data } = await supabase
        .from("friendships")
        .select("id, status")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
        .maybeSingle();
      if (data) {
        setFriendshipId(data.id);
        setFriendStatus(data.status);
      } else {
        setFriendshipId(null);
        setFriendStatus(null);
      }
    })();
  }, [user, targetUserId, isSelf]);

  const handleViewProfile = async () => {
    const { data: prof } = await supabase.from("profiles").select("*").eq("user_id", targetUserId).maybeSingle();
    const { data: mem } = await supabase.from("server_members").select("role, joined_at").eq("server_id", serverId).eq("user_id", targetUserId).maybeSingle();
    setProfileData(prof);
    setMemberData(mem);
    setProfileOpen(true);
  };

  const handleMessage = async () => {
    if (!user) return;
    const [u1, u2] = [user.id, targetUserId].sort();
    const { data: existing } = await supabase
      .from("dm_threads").select("id").eq("user1_id", u1).eq("user2_id", u2).maybeSingle();
    if (existing) {
      navigate(`/chat/${existing.id}`);
    } else {
      const { data: newThread } = await supabase
        .from("dm_threads").insert({ user1_id: u1, user2_id: u2 }).select("id").single();
      if (newThread) navigate(`/chat/${newThread.id}`);
    }
  };

  const handleCall = async () => {
    if (!user) return;
    const [u1, u2] = [user.id, targetUserId].sort();
    const { data: existing } = await supabase
      .from("dm_threads").select("id").eq("user1_id", u1).eq("user2_id", u2).maybeSingle();
    let threadId: string;
    if (existing) {
      threadId = existing.id;
    } else {
      const { data: newThread } = await supabase
        .from("dm_threads").insert({ user1_id: u1, user2_id: u2 }).select("id").single();
      if (!newThread) return;
      threadId = newThread.id;
    }
    navigate(`/chat/${threadId}?call=true`);
  };

  const handleAddFriend = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("friendships").insert({ requester_id: user.id, addressee_id: targetUserId });
    if (error) {
      toast({ title: t("common.error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("friends.requestSent") });
      setFriendStatus("pending");
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendshipId) return;
    await supabase.from("friendships").delete().eq("id", friendshipId);
    setFriendshipId(null);
    setFriendStatus(null);
    toast({ title: t("friends.removed") });
  };

  const handleMuteUser = () => {
    const newVol = volume > 0 ? 0 : 100;
    setUserVolume(targetUserId, newVol);
    toast({ title: newVol > 0 ? t("voiceContext.userUnmuted") : t("voiceContext.userMuted") });
  };

  const handleDisconnect = async () => {
    await supabase
      .from("voice_channel_participants")
      .delete()
      .eq("channel_id", channelId)
      .eq("user_id", targetUserId);
    toast({ title: t("voiceContext.disconnected") });
  };

  const handleCopyUsername = () => {
    if (targetUsername) {
      navigator.clipboard.writeText(`@${targetUsername}`);
      toast({ title: t("actions.copied") });
    }
  };

  const handleQuickMessage = async (message: string) => {
    if (!user || !message.trim()) return;
    const [u1, u2] = [user.id, targetUserId].sort();
    const { data: existing } = await supabase
      .from("dm_threads").select("id").eq("user1_id", u1).eq("user2_id", u2).maybeSingle();
    let threadId: string;
    if (existing) {
      threadId = existing.id;
    } else {
      const { data: newThread } = await supabase
        .from("dm_threads").insert({ user1_id: u1, user2_id: u2 }).select("id").single();
      if (!newThread) return;
      threadId = newThread.id;
    }
    await supabase.from("messages").insert({ thread_id: threadId, author_id: user.id, content: message.trim() });
    navigate(`/chat/${threadId}`);
  };

  if (isSelf) return <>{children}</>;

  const p = profileData;
  const name = p?.display_name || p?.username || "User";
  const username = p?.username || targetUsername || "user";
  const status = p?.status || "offline";

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={handleViewProfile}>
            <User className="h-4 w-4 me-2" />
            {t("voiceContext.viewProfile")}
          </ContextMenuItem>
          <ContextMenuItem onClick={handleMessage}>
            <MessageSquare className="h-4 w-4 me-2" />
            {t("actions.message")}
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCall}>
            <Phone className="h-4 w-4 me-2" />
            {t("actions.call")}
          </ContextMenuItem>

          <ContextMenuSeparator />

          <ContextMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
            <Volume2 className="h-3.5 w-3.5" />
            {t("voiceContext.userVolume")}
          </ContextMenuLabel>
          <div className="px-3 py-1.5" onPointerDown={(e) => e.stopPropagation()}>
            <Slider
              value={[volume]}
              onValueChange={([v]) => setUserVolume(targetUserId, v)}
              max={200}
              step={1}
              className="w-full"
            />
            <p className="text-[10px] text-muted-foreground text-center mt-1">{volume}%</p>
          </div>

          <ContextMenuItem onClick={handleMuteUser}>
            <VolumeX className="h-4 w-4 me-2" />
            {volume > 0 ? t("voiceContext.muteUser") : t("voiceContext.unmuteUser")}
          </ContextMenuItem>

          <ContextMenuSeparator />

          {friendStatus === "accepted" ? (
            <ContextMenuItem onClick={handleRemoveFriend} className="text-destructive">
              <UserMinus className="h-4 w-4 me-2" />
              {t("friends.remove")}
            </ContextMenuItem>
          ) : friendStatus === "pending" ? (
            <ContextMenuItem disabled>
              <UserPlus className="h-4 w-4 me-2" />
              {t("friends.pending")}
            </ContextMenuItem>
          ) : (
            <ContextMenuItem onClick={handleAddFriend}>
              <UserPlus className="h-4 w-4 me-2" />
              {t("friends.addFriend")}
            </ContextMenuItem>
          )}

          {targetUsername && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleCopyUsername}>
                <ClipboardCopy className="h-4 w-4 me-2" />
                {t("actions.copyUsername")}
              </ContextMenuItem>
            </>
          )}

          {isAdmin && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleDisconnect} className="text-destructive">
                <PhoneOff className="h-4 w-4 me-2" />
                {t("voiceContext.disconnect")}
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="p-0 overflow-hidden max-w-[340px] rounded-lg">
          <div
            className="h-[60px] w-full bg-primary/60"
            style={p?.banner_url ? { backgroundImage: `url(${p.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
          />
          <div className="px-4 pb-4">
            <div className="relative -mt-8 mb-2">
              <Avatar className="h-16 w-16 border-4 border-popover">
                <AvatarImage src={p?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-lg">{name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <StatusBadge status={(status === "offline" ? "invisible" : status) as UserStatus} size="md" className="absolute bottom-1 start-12" />
            </div>

            <StyledDisplayName
              displayName={name}
              gradientStart={p?.name_gradient_start}
              gradientEnd={p?.name_gradient_end}
              className="font-bold text-foreground text-base"
            />
            <div className="text-xs text-muted-foreground">@{username}</div>

            {memberData && (
              <Badge className={`mt-2 text-[10px] px-2 py-0.5 ${roleBadgeColors[memberData.role] || roleBadgeColors.member}`}>
                {t(`servers.${memberData.role}`)}
              </Badge>
            )}

            {p?.about_me && (
              <>
                <Separator className="my-3" />
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">{t("profile.aboutMe")}</div>
                  <p className="text-sm text-foreground whitespace-pre-wrap break-words">{p.about_me}</p>
                </div>
              </>
            )}

            <Separator className="my-3" />
            <div className="space-y-1.5">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">{t("profile.memberSince")}</div>
                <div className="text-xs text-foreground">{p?.created_at ? format(new Date(p.created_at), "MMM d, yyyy") : "—"}</div>
              </div>
              {memberData && (
                <div>
                  <div className="text-xs font-semibold uppercase text-muted-foreground">{t("profile.joinedServer")}</div>
                  <div className="text-xs text-foreground">{memberData.joined_at ? format(new Date(memberData.joined_at), "MMM d, yyyy") : "—"}</div>
                </div>
              )}
            </div>

            {user && targetUserId !== user.id && (
              <>
                <Separator className="my-3" />
                <Input
                  placeholder={t("profile.messageUser", { name: username })}
                  className="h-8 text-xs"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleQuickMessage((e.target as HTMLInputElement).value);
                    }
                  }}
                />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VoiceUserContextMenu;
