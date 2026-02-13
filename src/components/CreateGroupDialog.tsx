import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface CreateGroupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CreateGroupDialog = ({ open, onOpenChange }: CreateGroupDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [friends, setFriends] = useState<Profile[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    (async () => {
      const { data: friendships } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "accepted")
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!friendships || friendships.length === 0) { setFriends([]); return; }

      const otherIds = friendships.map((f: any) =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("*")
        .in("user_id", otherIds);

      setFriends(profiles || []);
    })();
  }, [open, user]);

  const toggleSelect = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(userId) ? next.delete(userId) : next.add(userId);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!user || !name.trim() || selectedIds.size === 0) return;
    setCreating(true);

    const { data: group, error } = await supabase
      .from("group_threads")
      .insert({ name: name.trim(), created_by: user.id } as any)
      .select("id")
      .single();

    if (error || !group) {
      toast({ title: t("common.error"), variant: "destructive" });
      setCreating(false);
      return;
    }

    // Add creator as admin + selected members
    const members = [
      { group_id: group.id, user_id: user.id, role: "admin" },
      ...Array.from(selectedIds).map((uid) => ({ group_id: group.id, user_id: uid, role: "member" })),
    ];

    await supabase.from("group_members").insert(members as any);

    toast({ title: t("groups.created") });
    setCreating(false);
    onOpenChange(false);
    setName("");
    setSelectedIds(new Set());
    navigate(`/group/${group.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("groups.create")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("groups.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("groups.namePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("groups.addMembers")}</Label>
            <div className="max-h-48 overflow-y-auto space-y-1 border border-border/50 rounded-lg p-2">
              {friends.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-2">{t("friends.noFriends")}</p>
              )}
              {friends.map((f) => (
                <label
                  key={f.user_id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.has(f.user_id)}
                    onCheckedChange={() => toggleSelect(f.user_id)}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={f.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm">
                      {(f.display_name || f.username || "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{f.display_name || f.username}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("actions.cancel")}</Button>
          <Button onClick={handleCreate} disabled={!name.trim() || selectedIds.size === 0 || creating}>
            {t("groups.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupDialog;
