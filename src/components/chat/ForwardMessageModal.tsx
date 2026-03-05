import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useForwardMessage } from "@/contexts/ForwardMessageContext";
import { toast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Hash, Search, Forward } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface ForwardTarget {
  id: string;
  name: string;
  avatarUrl?: string | null;
  type: "dm" | "group" | "channel";
  serverId?: string;
}

const ForwardMessageModal = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isOpen, payload, closeForwardModal } = useForwardMessage();
  const isMobile = useIsMobile();
  const [targets, setTargets] = useState<ForwardTarget[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !user) return;
    const fetchTargets = async () => {
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
        (p ?? []).forEach((pr) => { profiles[pr.user_id] = pr; });
      }

      const dmTargets: ForwardTarget[] = (dms ?? []).map((d) => {
        const otherId = d.user1_id === user.id ? d.user2_id : d.user1_id;
        const p = profiles[otherId];
        return { id: d.id, name: p?.display_name || "User", avatarUrl: p?.avatar_url, type: "dm" };
      });

      // Group threads
      const { data: memberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", user.id);

      let groupTargets: ForwardTarget[] = [];
      if (memberships?.length) {
        const groupIds = memberships.map((m) => m.group_id);
        const { data: groups } = await supabase
          .from("group_threads")
          .select("id, name, avatar_url")
          .in("id", groupIds);
        groupTargets = (groups ?? []).map((g) => ({
          id: g.id, name: g.name, avatarUrl: g.avatar_url, type: "group",
        }));
      }

      // Server channels the user belongs to
      const { data: serverMemberships } = await supabase
        .from("server_members")
        .select("server_id")
        .eq("user_id", user.id);

      let channelTargets: ForwardTarget[] = [];
      if (serverMemberships?.length) {
        const serverIds = serverMemberships.map((m) => m.server_id);
        const { data: channels } = await (supabase.from("channels") as any)
          .select("id, name, server_id, type, is_private")
          .in("server_id", serverIds)
          .eq("type", "text");

        // Get server names for display
        const { data: servers } = await supabase
          .from("servers")
          .select("id, name")
          .in("id", serverIds);
        const serverMap = new Map((servers ?? []).map((s) => [s.id, s.name]));

        channelTargets = (channels ?? []).map((ch: any) => ({
          id: ch.id,
          name: `#${ch.name} — ${serverMap.get(ch.server_id) || "Server"}`,
          type: "channel" as const,
          serverId: ch.server_id,
        }));
      }

      setTargets([...dmTargets, ...groupTargets, ...channelTargets]);
      setLoading(false);
    };
    fetchTargets();
  }, [isOpen, user]);

  const handleForward = async (target: ForwardTarget) => {
    if (!user || !payload || sending) return;
    setSending(target.id);
    const msg: any = {
      author_id: user.id,
      content: payload.content || "",
      is_forwarded: true,
    };
    if (payload.fileUrl) {
      msg.file_url = payload.fileUrl;
      msg.file_name = payload.fileName;
      msg.file_type = payload.fileType;
      msg.file_size = payload.fileSize;
    }
    if (target.type === "dm") msg.thread_id = target.id;
    else if (target.type === "group") msg.group_thread_id = target.id;
    else if (target.type === "channel") msg.channel_id = target.id;

    const { error } = await supabase.from("messages").insert(msg);
    setSending(null);
    if (error) {
      toast({ title: t("common.error"), variant: "destructive" });
    } else {
      // Update last_message_at
      if (target.type === "dm") {
        await supabase.from("dm_threads").update({ last_message_at: new Date().toISOString() }).eq("id", target.id);
      } else if (target.type === "group") {
        await supabase.from("group_threads").update({ last_message_at: new Date().toISOString() } as any).eq("id", target.id);
      }
      toast({ title: t("forward.success") });
      closeForwardModal();
    }
  };

  const filtered = targets.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
  const dmTargets = filtered.filter((t) => t.type === "dm");
  const groupTargets = filtered.filter((t) => t.type === "group");
  const channelTargets = filtered.filter((t) => t.type === "channel");

  const content = (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("forward.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
        />
      </div>
      <div className="max-h-72 overflow-y-auto space-y-1">
        {loading && <p className="text-sm text-muted-foreground p-2">{t("common.loading")}</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground p-2">{t("servers.noResults")}</p>
        )}
        {dmTargets.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground px-2 pt-2">{t("forward.dms")}</p>
            {dmTargets.map((target) => (
              <TargetRow key={target.id} target={target} onForward={handleForward} sending={sending} />
            ))}
          </>
        )}
        {groupTargets.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground px-2 pt-2">{t("forward.groups")}</p>
            {groupTargets.map((target) => (
              <TargetRow key={target.id} target={target} onForward={handleForward} sending={sending} />
            ))}
          </>
        )}
        {channelTargets.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground px-2 pt-2">{t("forward.servers")}</p>
            {channelTargets.map((target) => (
              <TargetRow key={target.id} target={target} onForward={handleForward} sending={sending} />
            ))}
          </>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && closeForwardModal()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2">
              <Forward className="h-5 w-5" />
              {t("forward.title")}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeForwardModal()}>
      <DialogContent className="max-w-sm" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="h-5 w-5" />
            {t("forward.title")}
          </DialogTitle>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
};

const TargetRow = ({ target, onForward, sending }: { target: ForwardTarget; onForward: (t: ForwardTarget) => void; sending: string | null }) => (
  <button
    onClick={() => onForward(target)}
    disabled={sending === target.id}
    className="flex items-center gap-3 w-full p-2 rounded-md hover:bg-accent transition-colors text-left disabled:opacity-50"
  >
    <Avatar className="h-8 w-8">
      <AvatarImage src={target.avatarUrl ?? undefined} />
      <AvatarFallback className="bg-primary/20 text-primary">
        {target.type === "group" ? <Users className="h-4 w-4" /> : target.type === "channel" ? <Hash className="h-4 w-4" /> : target.name[0]?.toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <span className="text-sm font-medium truncate flex-1">{target.name}</span>
    {sending === target.id && <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
  </button>
);

export default ForwardMessageModal;
