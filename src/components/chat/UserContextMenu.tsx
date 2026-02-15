import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, UserPlus, UserMinus, Phone, ClipboardCopy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

interface UserContextMenuProps {
  children: React.ReactNode;
  targetUserId: string;
  targetUsername?: string;
}

const UserContextMenu = ({ children, targetUserId, targetUsername }: UserContextMenuProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [friendStatus, setFriendStatus] = useState<string | null>(null);

  // Don't show for self
  const isSelf = user?.id === targetUserId;

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
    // Navigate to chat - call will be initiated from there
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

  if (isSelf) return <>{children}</>;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-48">
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
      </ContextMenuContent>
    </ContextMenu>
  );
};

export default UserContextMenu;
