import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { Loader2, MoreHorizontal, MessageSquare, Phone, UserPlus, ShieldAlert, Shield, UserX, Ban } from "lucide-react";

interface MemberWithProfile {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    status: string;
    created_at: string;
  } | null;
}

interface Props {
  serverId: string;
  canEdit: boolean;
}

const roleOrder: Record<string, number> = { owner: 0, admin: 1, member: 2 };

const MembersTab = ({ serverId }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "owner" | "admin" | "member">("all");
  const [kickTargetId, setKickTargetId] = useState<string | null>(null);
  const [kickTargetName, setKickTargetName] = useState("");

  const fetchMembers = async () => {
    const { data: rows } = await supabase
      .from("server_members" as any)
      .select("id, user_id, role, joined_at")
      .eq("server_id", serverId);

    const list = (rows as any[]) || [];
    if (list.length === 0) {
      setMembers([]);
      return;
    }

    const userIds = list.map((m) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, username, avatar_url, status, created_at")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const merged: MemberWithProfile[] = list.map((m) => ({
      ...m,
      profile: profileMap.get(m.user_id) ?? null,
    }));

    merged.sort((a, b) => (roleOrder[a.role] ?? 2) - (roleOrder[b.role] ?? 2));
    setMembers(merged);
  };

  useEffect(() => {
    if (!serverId) return;
    setLoading(true);
    fetchMembers().finally(() => setLoading(false));
  }, [serverId]);

  // Current user's role in this server
  const currentUserRole = members.find((m) => m.user_id === user?.id)?.role ?? "member";
  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";

  // Filtered list (local)
  const filtered = members.filter((m) => {
    const displayName = m.profile?.display_name || "";
    const username = m.profile?.username || "";
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || displayName.toLowerCase().includes(q) || username.toLowerCase().includes(q);
    const matchesRole = roleFilter === "all" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handlePromote = async (userId: string, username: string) => {
    await supabase
      .from("server_members" as any)
      .update({ role: "admin" } as any)
      .eq("server_id", serverId)
      .eq("user_id", userId);
    await supabase.from("server_audit_logs" as any).insert({
      server_id: serverId,
      actor_id: user?.id,
      action_type: "member_promoted",
      target_id: userId,
      changes: { target_username: username, new_role: "admin" },
    } as any);
    setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: "admin" } : m)));
    toast({ title: t("servers.promoted") });
  };

  const handleDemote = async (userId: string, username: string) => {
    await supabase
      .from("server_members" as any)
      .update({ role: "member" } as any)
      .eq("server_id", serverId)
      .eq("user_id", userId);
    await supabase.from("server_audit_logs" as any).insert({
      server_id: serverId,
      actor_id: user?.id,
      action_type: "member_demoted",
      target_id: userId,
      changes: { target_username: username, new_role: "member" },
    } as any);
    setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: "member" } : m)));
    toast({ title: t("servers.demoted") });
  };

  const openKickConfirm = (userId: string, displayName: string) => {
    setKickTargetId(userId);
    setKickTargetName(displayName);
  };

  const confirmKick = async () => {
    if (!kickTargetId) return;
    await supabase
      .from("server_members" as any)
      .delete()
      .eq("server_id", serverId)
      .eq("user_id", kickTargetId);
    await supabase.from("server_audit_logs" as any).insert({
      server_id: serverId,
      actor_id: user?.id,
      action_type: "member_kicked",
      target_id: kickTargetId,
      changes: { target_username: kickTargetName },
    } as any);
    setMembers((prev) => prev.filter((m) => m.user_id !== kickTargetId));
    toast({ title: t("servers.kicked") });
    setKickTargetId(null);
  };

  const handleMessage = async (targetUserId: string) => {
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

  const handleCall = async (targetUserId: string) => {
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

  const handleComingSoon = () => {
    toast({ title: t("serverSettings.comingSoon") });
  };

  // ─── Role badge helper ──────────────────────────────────────────────────────

  const roleBadge = (role: string) => {
    if (role === "owner") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/15 text-yellow-600 border border-yellow-500/30">
          {t("servers.owner")}
        </span>
      );
    }
    if (role === "admin") {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/15 text-blue-600 border border-blue-500/30">
          {t("servers.admin")}
        </span>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">
        {t("servers.member")}
      </Badge>
    );
  };

  // ─── Skeleton ──────────────────────────────────────────────────────────────

  const skeletonRow = (key: number) => (
    <TableRow key={key}>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="space-y-1">
            <div className="h-3 w-28 bg-muted animate-pulse rounded" />
            <div className="h-2.5 w-20 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </TableCell>
      <TableCell><div className="h-3 w-24 bg-muted animate-pulse rounded" /></TableCell>
      <TableCell><div className="h-3 w-24 bg-muted animate-pulse rounded" /></TableCell>
      <TableCell><div className="h-5 w-16 bg-muted animate-pulse rounded" /></TableCell>
      <TableCell />
    </TableRow>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {t("serverSettings.members")} — {members.length}
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("serverSettings.membersSearchPlaceholder")}
          className="flex-1"
        />
        <Select
          value={roleFilter}
          onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("serverSettings.membersFilterAll")}</SelectItem>
            <SelectItem value="owner">{t("serverSettings.membersFilterOwner")}</SelectItem>
            <SelectItem value="admin">{t("serverSettings.membersFilterAdmin")}</SelectItem>
            <SelectItem value="member">{t("serverSettings.membersFilterMember")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("serverSettings.tableColName")}</TableHead>
                <TableHead>{t("serverSettings.colMemberSince")}</TableHead>
                <TableHead>{t("serverSettings.colJoinedMshb")}</TableHead>
                <TableHead>{t("serverSettings.colRole")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>{[0, 1, 2, 3, 4].map(skeletonRow)}</TableBody>
          </Table>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-10">
          {t("serverSettings.noMembers")}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>{t("serverSettings.tableColName")}</TableHead>
                <TableHead>{t("serverSettings.colMemberSince")}</TableHead>
                <TableHead>{t("serverSettings.colJoinedMshb")}</TableHead>
                <TableHead>{t("serverSettings.colRole")}</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((m) => {
                const p = m.profile;
                const displayName = p?.display_name || p?.username || "User";
                const username = p?.username || "";
                const isSelf = m.user_id === user?.id;
                const canPromote = isOwner && m.role === "member" && !isSelf;
                const canDemote = isOwner && m.role === "admin" && !isSelf;
                const canKick =
                  ((isOwner && m.role !== "owner") || (isAdmin && m.role === "member")) &&
                  !isSelf;

                return (
                  <TableRow key={m.user_id}>
                    {/* Name */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={p?.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{displayName}</p>
                          {username && (
                            <p className="text-xs text-muted-foreground truncate">@{username}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Member Since */}
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(m.joined_at).toLocaleDateString()}
                    </TableCell>

                    {/* Joined Mshb */}
                    <TableCell className="text-sm text-muted-foreground">
                      {p?.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                    </TableCell>

                    {/* Role */}
                    <TableCell>{roleBadge(m.role)}</TableCell>

                    {/* Actions */}
                    <TableCell>
                      {!isSelf && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Contact actions */}
                            <DropdownMenuItem onClick={() => handleMessage(m.user_id)}>
                              <MessageSquare className="h-4 w-4 me-2" />
                              {t("serverSettings.actionMessage")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCall(m.user_id)}>
                              <Phone className="h-4 w-4 me-2" />
                              {t("serverSettings.actionCall")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleComingSoon}>
                              <UserPlus className="h-4 w-4 me-2" />
                              {t("serverSettings.actionAddFriend")}
                            </DropdownMenuItem>

                            {/* Moderation actions */}
                            {(canPromote || canDemote || canKick) && (
                              <DropdownMenuSeparator />
                            )}
                            {canPromote && (
                              <DropdownMenuItem
                                onClick={() => handlePromote(m.user_id, username || displayName)}
                              >
                                <ShieldAlert className="h-4 w-4 me-2" />
                                {t("servers.promoteAdmin")}
                              </DropdownMenuItem>
                            )}
                            {canDemote && (
                              <DropdownMenuItem
                                onClick={() => handleDemote(m.user_id, username || displayName)}
                              >
                                <Shield className="h-4 w-4 me-2" />
                                {t("servers.demoteToMember")}
                              </DropdownMenuItem>
                            )}
                            {canKick && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => openKickConfirm(m.user_id, displayName)}
                              >
                                <UserX className="h-4 w-4 me-2" />
                                {t("servers.kick")}
                              </DropdownMenuItem>
                            )}

                            {/* Block — placeholder */}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-muted-foreground"
                              onClick={handleComingSoon}
                            >
                              <Ban className="h-4 w-4 me-2" />
                              {t("serverSettings.actionBlock")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Kick Confirmation */}
      <AlertDialog open={!!kickTargetId} onOpenChange={(open) => !open && setKickTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("serverSettings.kickConfirmTitle", { name: kickTargetName })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("serverSettings.kickConfirmDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmKick}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("servers.kick")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MembersTab;
