import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Pencil, Trash2, UserPlus, LogOut } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface MemberWithProfile {
  id: string;
  user_id: string;
  role: string;
  profile: Profile | null;
}

interface GroupSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  isAdmin: boolean;
  onLeave: () => void;
}

const GroupSettingsDialog = ({ open, onOpenChange, groupId, isAdmin, onLeave }: GroupSettingsDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [groupName, setGroupName] = useState("");
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [editing, setEditing] = useState(false);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);

  const loadData = async () => {
    const { data: group } = await supabase
      .from("group_threads")
      .select("name")
      .eq("id", groupId)
      .maybeSingle();
    if (group) setGroupName((group as any).name);

    const { data: memberRows } = await supabase
      .from("group_members")
      .select("*")
      .eq("group_id", groupId);

    if (!memberRows) return;

    const userIds = memberRows.map((m: any) => m.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .in("user_id", userIds);

    setMembers(
      memberRows.map((m: any) => ({
        ...m,
        profile: profiles?.find((p) => p.user_id === m.user_id) || null,
      }))
    );
  };

  useEffect(() => {
    if (open) loadData();
  }, [open, groupId]);

  const loadFriends = async () => {
    if (!user) return;
    const { data: friendships } = await supabase
      .from("friendships")
      .select("*")
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (!friendships) return;
    const otherIds = friendships.map((f: any) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );
    const memberUserIds = new Set(members.map((m) => m.user_id));
    const nonMemberIds = otherIds.filter((id) => !memberUserIds.has(id));
    if (nonMemberIds.length === 0) { setFriends([]); return; }

    const { data } = await supabase.from("profiles").select("*").in("user_id", nonMemberIds);
    setFriends(data || []);
  };

  const handleRename = async () => {
    if (!groupName.trim()) return;
    await supabase.from("group_threads").update({ name: groupName.trim() } as any).eq("id", groupId);
    setEditing(false);
    toast({ title: t("profile.saved") });
  };

  const addMember = async (userId: string) => {
    await supabase.from("group_members").insert({ group_id: groupId, user_id: userId } as any);
    loadData();
    setFriends((prev) => prev.filter((f) => f.user_id !== userId));
  };

  const removeMember = async (memberId: string) => {
    await supabase.from("group_members").delete().eq("id", memberId);
    loadData();
  };

  const handleLeave = async () => {
    if (!user) return;
    await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    onOpenChange(false);
    onLeave();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("groups.settings")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Group name */}
          <div className="space-y-2">
            <Label>{t("groups.name")}</Label>
            {editing && isAdmin ? (
              <div className="flex gap-2">
                <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} />
                <Button size="sm" onClick={handleRename}>{t("actions.save")}</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium">{groupName}</span>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Members */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("groups.members")} ({members.length})</Label>
              {isAdmin && (
                <Button variant="ghost" size="sm" onClick={() => { setShowAddMember(!showAddMember); if (!showAddMember) loadFriends(); }}>
                  <UserPlus className="h-4 w-4 me-1" />
                  {t("groups.addMembers")}
                </Button>
              )}
            </div>

            {showAddMember && isAdmin && (
              <div className="border border-border/50 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                {friends.length === 0 && <p className="text-xs text-muted-foreground text-center py-1">No friends to add</p>}
                {friends.map((f) => (
                  <div key={f.user_id} className="flex items-center gap-2 p-1">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={f.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {(f.display_name || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm flex-1 truncate">{f.display_name || f.username}</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => addMember(f.user_id)}>
                      {t("friends.add")}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="max-h-48 overflow-y-auto space-y-1">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={m.profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {(m.profile?.display_name || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium flex-1 truncate">{m.profile?.display_name || m.profile?.username || "User"}</span>
                  <Badge variant={m.role === "admin" ? "default" : "secondary"} className="text-[10px]">
                    {t(`groups.${m.role}`)}
                  </Badge>
                  {isAdmin && m.user_id !== user?.id && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeMember(m.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Leave group */}
          <Button variant="destructive" className="w-full" onClick={handleLeave}>
            <LogOut className="h-4 w-4 me-2" />
            {t("groups.leave")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupSettingsDialog;
