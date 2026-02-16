import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { User, MessageSquare, Phone, Volume2, VolumeX, UserPlus, UserMinus, PhoneOff, ClipboardCopy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
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
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<string | null>(null);
  const [userVolume, setUserVolume] = useState(100);

  const isSelf = user?.id === targetUserId;
  const isOwner = user?.id === serverOwnerId;
  const isAdmin = currentUserRole === "owner" || currentUserRole === "admin";

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

  const handleViewProfile = () => {
    // Navigate to server view - the profile popover is on the member list
    // For now, just show a toast or navigate
    navigate(`/server/${serverId}`);
  };

  const handleMessage = async () => {
    if (!user) return;
    const [u1, u2] = [user.id, targetUserId].sort();
    const { data: existing } = await supabase
      .from("dm_threads")
      .select("id")
      .eq("user1_id", u1)
      .eq("user2_id", u2)
      .maybeSingle();
    if (existing) {
      navigate(`/chat/${existing.id}`);
    } else {
      const { data: newThread } = await supabase
        .from("dm_threads")
        .insert({ user1_id: u1, user2_id: u2 })
        .select("id")
        .single();
      if (newThread) navigate(`/chat/${newThread.id}`);
    }
  };

  const handleCall = async () => {
    if (!user) return;
    const [u1, u2] = [user.id, targetUserId].sort();
    const { data: existing } = await supabase
      .from("dm_threads")
      .select("id")
      .eq("user1_id", u1)
      .eq("user2_id", u2)
      .maybeSingle();
    let threadId: string;
    if (existing) {
      threadId = existing.id;
    } else {
      const { data: newThread } = await supabase
        .from("dm_threads")
        .insert({ user1_id: u1, user2_id: u2 })
        .select("id")
        .single();
      if (!newThread) return;
      threadId = newThread.id;
    }
    navigate(`/chat/${threadId}`);
  };

  const handleAddFriend = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: targetUserId });
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
    setUserVolume(userVolume > 0 ? 0 : 100);
    toast({ title: userVolume > 0 ? t("voiceContext.userMuted") : t("voiceContext.userUnmuted") });
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

  if (isSelf) return <>{children}</>;

  return (
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

        {/* User Volume */}
        <ContextMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
          <Volume2 className="h-3.5 w-3.5" />
          {t("voiceContext.userVolume")}
        </ContextMenuLabel>
        <div className="px-3 py-1.5" onPointerDown={(e) => e.stopPropagation()}>
          <Slider
            value={[userVolume]}
            onValueChange={([v]) => setUserVolume(v)}
            max={200}
            step={1}
            className="w-full"
          />
          <p className="text-[10px] text-muted-foreground text-center mt-1">{userVolume}%</p>
        </div>

        <ContextMenuItem onClick={handleMuteUser}>
          <VolumeX className="h-4 w-4 me-2" />
          {userVolume > 0 ? t("voiceContext.muteUser") : t("voiceContext.unmuteUser")}
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

        {/* Disconnect - only for admins/owners */}
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
  );
};

export default VoiceUserContextMenu;
