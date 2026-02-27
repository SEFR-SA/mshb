import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { MessageSquare, UserPlus, UserMinus, Phone, ClipboardCopy, ShieldCheck, ShieldOff, ShieldAlert, UserX } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
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
  const [cmRolesLoaded, setCmRolesLoaded] = useState(false);
  const [cmServerRoles, setCmServerRoles] = useState<{ id: string; name: string; color: string }[]>([]);
  const [cmMemberRoleIds, setCmMemberRoleIds] = useState<string[]>([]);

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

  const loadRolesIfNeeded = async () => {
    if (cmRolesLoaded) return;
    const [{ data: roles }, { data: assigned }] = await Promise.all([
      supabase.from("server_roles" as any).select("id, name, color").eq("server_id", serverId).order("position"),
      supabase.from("member_roles" as any).select("role_id").eq("server_id", serverId).eq("user_id", targetUserId),
    ]);
    setCmServerRoles((roles as any[]) || []);
    setCmMemberRoleIds(((assigned as any[]) || []).map((r: any) => r.role_id));
    setCmRolesLoaded(true);
  };

  const toggleCmRole = async (roleId: string, currentlyHas: boolean) => {
    if (currentlyHas) {
      await supabase.from("member_roles" as any).delete()
        .eq("user_id", targetUserId).eq("role_id", roleId).eq("server_id", serverId);
      setCmMemberRoleIds((prev) => prev.filter((id) => id !== roleId));
    } else {
      await supabase.from("member_roles" as any).insert({ server_id: serverId, user_id: targetUserId, role_id: roleId } as any);
      setCmMemberRoleIds((prev) => [...prev, roleId]);
    }
    toast({ title: currentlyHas ? t("serverSettings.roleUnassigned") : t("serverSettings.roleAssigned") });
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
        {(isOwner || isAdmin) && targetRole !== "owner" && (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub onOpenChange={(open) => open && loadRolesIfNeeded()}>
              <ContextMenuSubTrigger>
                <ShieldAlert className="h-4 w-4 me-2" />
                {t("serverSettings.assignRoles")}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                {cmServerRoles.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-3 py-2">{t("serverSettings.noRolesAvailable")}</p>
                ) : (
                  cmServerRoles.map((role) => {
                    const hasRole = cmMemberRoleIds.includes(role.id);
                    return (
                      <ContextMenuCheckboxItem
                        key={role.id}
                        checked={hasRole}
                        onCheckedChange={() => toggleCmRole(role.id, hasRole)}
                      >
                        <span className="h-3 w-3 rounded-full me-2 shrink-0 inline-block" style={{ backgroundColor: role.color }} />
                        {role.name}
                      </ContextMenuCheckboxItem>
                    );
                  })
                )}
              </ContextMenuSubContent>
            </ContextMenuSub>
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
