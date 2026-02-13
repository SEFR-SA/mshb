import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";

interface ForwardImageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface ThreadOption {
  id: string;
  name: string;
  avatarUrl?: string | null;
  type: "dm" | "group";
}

const ForwardImageDialog = ({
  open,
  onOpenChange,
  fileUrl,
  fileName,
  fileType,
  fileSize,
}: ForwardImageDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [threads, setThreads] = useState<ThreadOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    const fetchThreads = async () => {
      setLoading(true);
      // DM threads
      const { data: dms } = await supabase
        .from("dm_threads")
        .select("id, user1_id, user2_id")
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      const otherIds = (dms ?? []).map((d) => (d.user1_id === user.id ? d.user2_id : d.user1_id));
      let profiles: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      if (otherIds.length) {
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", otherIds);
        (p ?? []).forEach((pr) => {
          profiles[pr.user_id] = pr;
        });
      }

      const dmOptions: ThreadOption[] = (dms ?? []).map((d) => {
        const otherId = d.user1_id === user.id ? d.user2_id : d.user1_id;
        const p = profiles[otherId];
        return { id: d.id, name: p?.display_name || "User", avatarUrl: p?.avatar_url, type: "dm" };
      });

      // Group threads
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      let groupOptions: ThreadOption[] = [];
      if (memberships?.length) {
        const groupIds = memberships.map((m) => m.group_id);
        const { data: groups } = await supabase
          .from("group_threads")
          .select("id, name, avatar_url")
          .in("id", groupIds);
        groupOptions = (groups ?? []).map((g) => ({
          id: g.id,
          name: g.name,
          avatarUrl: g.avatar_url,
          type: "group",
        }));
      }

      setThreads([...dmOptions, ...groupOptions]);
      setLoading(false);
    };
    fetchThreads();
  }, [open, user]);

  const handleForward = async (thread: ThreadOption) => {
    if (!user) return;
    const msg: any = {
      author_id: user.id,
      content: "",
      file_url: fileUrl,
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
    };
    if (thread.type === "dm") msg.thread_id = thread.id;
    else msg.group_thread_id = thread.id;

    const { error } = await supabase.from("messages").insert(msg);
    if (error) {
      toast({ title: t("common.error"), variant: "destructive" });
    } else {
      toast({ title: t("imageViewer.forwarded") });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{t("imageViewer.forward")}</DialogTitle>
        </DialogHeader>
        <div className="max-h-64 overflow-y-auto space-y-1">
          {loading && <p className="text-sm text-muted-foreground p-2">{t("common.loading")}</p>}
          {!loading && threads.length === 0 && (
            <p className="text-sm text-muted-foreground p-2">{t("inbox.noThreads")}</p>
          )}
          {threads.map((thread) => (
            <button
              key={thread.id}
              onClick={() => handleForward(thread)}
              className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-accent transition-colors text-left"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={thread.avatarUrl ?? undefined} />
                <AvatarFallback>
                  {thread.type === "group" ? <Users className="h-4 w-4" /> : thread.name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium truncate">{thread.name}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForwardImageDialog;
