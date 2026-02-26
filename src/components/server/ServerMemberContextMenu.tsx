import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, UserPlus, UserMinus, Phone, ClipboardCopy, ShieldCheck, ShieldOff, UserX } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface ServerMemberContextMenuProps {
  children: React.ReactNode;
  targetUserId: string;
  targetUsername?: string;
  serverId: string;
  targetRole: string;
  currentUserRole: string | null;
}

const ServerMemberContextMenu = ({
  children,
  targetUserId,
  targetUsername,
  serverId,
  targetRole,
  currentUserRole,
}: ServerMemberContextMenuProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<string | null>(null);

  const isSelf = user?.id === targetUserId;
  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";

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

  const handleCopyUsername = () => {
    if (targetUsername) {
      navigator.clipboard.writeText(`@${targetUsername}`);
      toast({ title: t("actions.copied") });
    }
  };

  const handlePromote = async () => {
    await supabase
      .from("server_members" as any)
      .update({ role: "admin" } as any)
      .eq("server_id", serverId)
      .eq("user_id", targetUserId);
    toast({ title: t("servers.promoted") });
  };

  const handleDemote = async () => {
    await supabase
      .from("server_members" as any)
      .update({ role: "member" } as any)
      .eq("server_id", serverId)
      .eq("user_id", targetUserId);
    toast({ title: t("servers.demoted") });
  };

  const handleKick = async () => {
    await supabase
      .from("server_members" as any)
      .delete()
      .eq("server_id", serverId)
      .eq("user_id", targetUserId);
    await supabase.from("server_audit_logs" as any).insert({
      server_id: serverId,
      actor_id: user?.id,
      action_type: "member_kicked",
      target_id: targetUserId,
      changes: { target_username: targetUsername || targetUserId },
    } as any);
    toast({ title: t("servers.kicked") });
  };

  if (isSelf) return <>{children}</>;

  const canPromote = isOwner && targetRole === "member";
  const canDemote = isOwner && targetRole === "admin";
  const canKick = (isOwner && targetRole !== "owner") || (isAdmin && targetRole === "member");
  const hasAdminActions = canPromote || canDemote || canKick;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={handleMessage}>
          <MessageSquare className="h-4 w-4 me-2" />
          {t("actions.message")}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleCall}>
          <Phone className="h-4 w-4 me-2" />
          {t("actions.call")}
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
        {hasAdminActions && (
          <>
            <ContextMenuSeparator />
            {canPromote && (
              <ContextMenuItem onClick={handlePromote}>
                <ShieldCheck className="h-4 w-4 me-2" />
                {t("servers.promoteAdmin")}
              </ContextMenuItem>
            )}
            {canDemote && (
              <ContextMenuItem onClick={handleDemote}>
                <ShieldOff className="h-4 w-4 me-2" />
                {t("servers.demoteToMember")}
              </ContextMenuItem>
            )}
            {canKick && (
              <ContextMenuItem onClick={handleKick} className="text-destructive">
                <UserX className="h-4 w-4 me-2" />
                {t("servers.kick")}
              </ContextMenuItem>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default ServerMemberContextMenu;
