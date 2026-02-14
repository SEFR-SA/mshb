import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";

interface Member {
  user_id: string;
  role: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    status: string;
  };
}

interface Props {
  serverId: string;
}

const ServerMemberList = ({ serverId }: Props) => {
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("server_members" as any)
        .select("user_id, role")
        .eq("server_id", serverId);
      if (!data) return;
      const userIds = (data as any[]).map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, status")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      setMembers(
        (data as any[]).map((m) => ({ ...m, profile: profileMap.get(m.user_id) }))
      );
    };
    load();

    const channel = supabase
      .channel(`server-members-${serverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${serverId}` }, () => load())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [serverId]);

  const roleOrder = { owner: 0, admin: 1, member: 2 };
  const grouped = members.reduce<Record<string, Member[]>>((acc, m) => {
    const label = t(`servers.${m.role}`);
    (acc[label] = acc[label] || []).push(m);
    return acc;
  }, {});

  const sortedGroups = Object.entries(grouped).sort(([, a], [, b]) => {
    const ra = roleOrder[(a[0]?.role as keyof typeof roleOrder) || "member"] ?? 2;
    const rb = roleOrder[(b[0]?.role as keyof typeof roleOrder) || "member"] ?? 2;
    return ra - rb;
  });

  return (
    <div className="w-[240px] flex flex-col bg-sidebar-background border-s border-sidebar-border shrink-0 overflow-hidden">
      <div className="p-3 border-b border-sidebar-border">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">{t("servers.members")} — {members.length}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {sortedGroups.map(([label, mems]) => (
          <div key={label}>
            <span className="text-[11px] font-semibold uppercase text-muted-foreground px-1">{label} — {mems.length}</span>
            <div className="mt-1 space-y-0.5">
              {mems.map((m) => {
                const p = m.profile;
                const name = p?.display_name || p?.username || "User";
                const status = p?.status || "offline";
                return (
                  <div key={m.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <StatusBadge status={(status === "offline" ? "invisible" : status) as UserStatus} size="sm" className="absolute bottom-0 end-0" />
                    </div>
                    <span className={`text-sm truncate ${status === "offline" || status === "invisible" ? "text-muted-foreground" : "text-foreground"}`}>
                      {name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServerMemberList;
