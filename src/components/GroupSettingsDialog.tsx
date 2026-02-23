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
import { Pencil, Trash2, UserPlus, LogOut, Camera, ImagePlus } from "lucide-react";
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
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [editing, setEditing] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [friends, setFriends] = useState<Profile[]>([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [uploading, setUploading] = useState(false);

  const loadData = async () => {
    const { data: group } = await supabase
      .from("group_threads")
      .select("*")
      .eq("id", groupId)
      .maybeSingle();
    if (group) {
      setGroupName((group as any).name);
      setDescription((group as any).description || "");
      setAvatarUrl((group as any).avatar_url || "");
      setBannerUrl((group as any).banner_url || "");
    }

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

  const handleDescriptionSave = async () => {
    await supabase.from("group_threads").update({ description: description.trim() } as any).eq("id", groupId);
    setEditingDescription(false);
    toast({ title: t("profile.saved") });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "avatar" | "banner") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `groups/${groupId}/${type}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: t("common.error"), description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const updateField = type === "avatar" ? { avatar_url: urlData.publicUrl } : { banner_url: urlData.publicUrl };
    await supabase.from("group_threads").update(updateField as any).eq("id", groupId);

    if (type === "avatar") setAvatarUrl(urlData.publicUrl);
    else setBannerUrl(urlData.publicUrl);

    toast({ title: t("profile.saved") });
    setUploading(false);
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
    const { error } = await supabase.from("group_members").delete().eq("group_id", groupId).eq("user_id", user.id);
    if (error) {
      toast({ title: t("common.error"), variant: "destructive" });
      return;
    }
    onOpenChange(false);
    onLeave();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("groups.settings")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Group Banner */}
          <div className="space-y-2">
            <Label>{t("groups.banner")}</Label>
            <div className="relative rounded-lg overflow-hidden">
              {bannerUrl ? (
                <img src={bannerUrl} alt="" className="h-28 w-full object-cover" />
              ) : (
                <div className="h-28 w-full bg-primary/20 rounded-lg" />
              )}
              {isAdmin && (
                <label className="absolute top-2 end-2 h-8 w-8 rounded-full bg-background/80 flex items-center justify-center cursor-pointer hover:bg-background transition-colors">
                  <ImagePlus className="h-4 w-4" />
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "banner")} disabled={uploading} />
                </label>
              )}
            </div>
          </div>

          {/* Group Photo */}
          <div className="space-y-2">
            <Label>{t("groups.profilePhoto")}</Label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xl">
                    {groupName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isAdmin && (
                  <label className="absolute bottom-0 end-0 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                    <Camera className="h-3 w-3" />
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "avatar")} disabled={uploading} />
                  </label>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {isAdmin ? t("groups.uploadPhoto") : groupName}
              </span>
            </div>
          </div>

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

           {/* Group Description */}
           <div className="space-y-2">
             <Label>{t("groups.description")}</Label>
             {editingDescription && isAdmin ? (
               <div className="flex gap-2">
                 <textarea
                   value={description}
                   onChange={(e) => setDescription(e.target.value)}
                   placeholder={t("groups.descriptionPlaceholder")}
                   className="flex h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                 />
                 <Button size="sm" onClick={handleDescriptionSave}>{t("actions.save")}</Button>
               </div>
             ) : (
               <div className="flex items-start gap-2">
                 <p className="text-sm text-muted-foreground flex-1">{description || <span className="italic">{t("groups.noDescription")}</span>}</p>
                 {isAdmin && (
                   <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingDescription(true)}>
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
