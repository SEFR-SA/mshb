import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useInviteToServer } from "@/contexts/InviteToServerContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { Search, Check } from "lucide-react";

interface ServerItem {
  id: string;
  name: string;
  icon_url: string | null;
  invite_code: string;
  banner_url: string | null;
}

const InviteToServerModal = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isOpen, targetUserId, close } = useInviteToServer();
  const isMobile = useIsMobile();
  const [servers, setServers] = useState<ServerItem[]>([]);
  const [search, setSearch] = useState("");
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !user) return;
    setSentTo(new Set());
    setSearch("");
    (async () => {
      setLoading(true);
      const { data: memberships } = await supabase
        .from("server_members")
        .select("server_id")
        .eq("user_id", user.id);
      if (!memberships?.length) { setServers([]); setLoading(false); return; }
      const ids = memberships.map((m: any) => m.server_id);
      const { data } = await supabase
        .from("servers")
        .select("id, name, icon_url, invite_code, banner_url")
        .in("id", ids);
      setServers((data as ServerItem[]) || []);
      setLoading(false);
    })();
  }, [isOpen, user]);

  const sendInvite = async (server: ServerItem) => {
    if (!user || !targetUserId) return;

    // Optimistic: mark as sent immediately
    setSentTo((prev) => new Set(prev).add(server.id));
    toast({ title: t("inviteToServer.sent") });

    try {
      const [u1, u2] = [user.id, targetUserId].sort();
      const { data: existing } = await supabase
        .from("dm_threads")
        .select("id")
        .eq("user1_id", u1)
        .eq("user2_id", u2)
        .maybeSingle();
      let threadId = existing?.id;
      if (!threadId) {
        const { data: newThread } = await supabase
          .from("dm_threads")
          .insert({ user1_id: u1, user2_id: u2 })
          .select("id")
          .single();
        threadId = newThread?.id;
      }
      if (!threadId) {
        setSentTo((prev) => { const next = new Set(prev); next.delete(server.id); return next; });
        return;
      }

      await supabase.from("messages").insert({
        thread_id: threadId,
        author_id: user.id,
        content: "",
        type: "server_invite",
        metadata: {
          server_id: server.id,
          invite_code: server.invite_code,
          server_name: server.name,
          server_icon_url: server.icon_url || "",
          server_banner_url: server.banner_url || undefined,
        },
      } as any);

      await supabase
        .from("dm_threads")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", threadId);
    } catch {
      setSentTo((prev) => { const next = new Set(prev); next.delete(server.id); return next; });
    }
  };

  const filtered = servers.filter((s) => {
    if (!search.trim()) return true;
    return s.name.toLowerCase().includes(search.toLowerCase());
  });

  const body = (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("inviteToServer.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
        />
      </div>
      <ScrollArea className="max-h-[300px]">
        <div className="space-y-1">
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t("common.loading")}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">{t("inviteToServer.noServers")}</p>
          ) : (
            filtered.map((s) => {
              const isSent = sentTo.has(s.id);
              return (
                <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={s.icon_url || ""} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {s.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium flex-1 truncate">{s.name}</span>
                  <Button
                    size="sm"
                    variant={isSent ? "secondary" : "default"}
                    disabled={isSent}
                    onClick={() => sendInvite(s)}
                    className="h-7 text-xs"
                  >
                    {isSent ? (
                      <><Check className="h-3 w-3 me-1" />{t("servers.sent")}</>
                    ) : (
                      t("servers.sendInvite")
                    )}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(o) => !o && close()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t("inviteToServer.title")}</DrawerTitle>
            <DrawerDescription>{t("inviteToServer.description")}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">{body}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inviteToServer.title")}</DialogTitle>
          <DialogDescription>{t("inviteToServer.description")}</DialogDescription>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  );
};

export default InviteToServerModal;
