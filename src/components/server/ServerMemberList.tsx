import React, { useEffect, useState } from "react";
import { MemberListSkeleton } from "@/components/skeletons/SkeletonLoaders";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import ServerMemberContextMenu from "@/components/server/ServerMemberContextMenu";
import StyledDisplayName from "@/components/StyledDisplayName";

interface Member {
  user_id: string;
  role: string;
  joined_at: string;
  profile?: {
    display_name: string | null;
    username: string | null;
    avatar_url: string | null;
    banner_url: string | null;
    about_me: string | null;
    status: string;
    created_at: string;
    name_gradient_start?: string | null;
    name_gradient_end?: string | null;
  };
}

interface Props {
  serverId: string;
}

const roleBadgeColors: Record<string, string> = {
  owner: "bg-green-600 text-white hover:bg-green-600",
  admin: "bg-blue-600 text-white hover:bg-blue-600",
  member: "bg-muted text-muted-foreground hover:bg-muted",
};

const ServerMemberList = ({ serverId }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("server_members" as any)
        .select("user_id, role, joined_at")
        .eq("server_id", serverId);
      if (!data) return;
      const userIds = (data as any[]).map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url, banner_url, about_me, status, created_at, name_gradient_start, name_gradient_end")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
      setMembers(
        (data as any[]).map((m) => ({ ...m, profile: profileMap.get(m.user_id) }))
      );
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel(`server-members-${serverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${serverId}` }, () => load())
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [serverId]);

  const handleQuickMessage = async (targetUserId: string, message: string) => {
    if (!user || !message.trim()) return;

    // Find or create DM thread
    const { data: existing } = await supabase
      .from("dm_threads")
      .select("id")
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`)
      .maybeSingle();

    let threadId: string;
    if (existing) {
      threadId = existing.id;
    } else {
      const { data: newThread, error } = await supabase
        .from("dm_threads")
        .insert({ user1_id: user.id, user2_id: targetUserId })
        .select("id")
        .single();
      if (error || !newThread) {
        toast.error(t("common.error"));
        return;
      }
      threadId = newThread.id;
    }

    // Send the message
    await supabase.from("messages").insert({
      thread_id: threadId,
      author_id: user.id,
      content: message.trim(),
    });

    navigate(`/chat/${threadId}`);
  };

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

  const currentUserRole = members.find((m) => m.user_id === user?.id)?.role ?? null;

  return (
    <div className="w-[240px] flex flex-col bg-sidebar-background border-s border-sidebar-border shrink-0 overflow-hidden">
      <div className="p-3 border-b border-sidebar-border">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">{t("servers.members")} — {members.length}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {loading ? (
          <MemberListSkeleton count={8} />
        ) : (
          <div className="animate-fade-in space-y-4">
        {sortedGroups.map(([label, mems]) => (
          <div key={label}>
            <span className="text-[11px] font-semibold uppercase text-muted-foreground px-1">{label} — {mems.length}</span>
            <div className="mt-1 space-y-0.5">
              {mems.map((m) => {
                const p = m.profile;
                const name = p?.display_name || p?.username || "User";
                const username = p?.username || "user";
                const status = p?.status || "offline";

                const profileCardContent = (
                  <div className="overflow-hidden rounded-lg bg-popover">
                    {/* Banner */}
                    <div
                      className="h-[60px] w-full bg-primary/60"
                      style={p?.banner_url ? { backgroundImage: `url(${p.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                    />
                    {/* Avatar + Info */}
                    <div className="px-4 pb-3">
                      <div className="relative -mt-8 mb-2">
                        <Avatar className="h-16 w-16 border-4 border-popover">
                          <AvatarImage src={p?.avatar_url || ""} />
                          <AvatarFallback className="bg-primary/20 text-primary text-lg">{name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <StatusBadge status={(status === "offline" ? "invisible" : status) as UserStatus} size="md" className="absolute bottom-1 start-12" />
                      </div>

                      <div className="font-bold text-foreground text-base">{name}</div>
                      <div className="text-xs text-muted-foreground">@{username}</div>

                      <Badge className={`mt-2 text-[10px] px-2 py-0.5 ${roleBadgeColors[m.role] || roleBadgeColors.member}`}>
                        {t(`servers.${m.role}`)}
                      </Badge>

                      {p?.about_me && (
                        <>
                          <Separator className="my-3" />
                          <div>
                            <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">{t("profile.aboutMe")}</div>
                            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{p.about_me}</p>
                          </div>
                        </>
                      )}

                      <Separator className="my-3" />

                      <div className="space-y-1.5">
                        <div>
                          <div className="text-xs font-semibold uppercase text-muted-foreground">{t("profile.memberSince")}</div>
                          <div className="text-xs text-foreground">{p?.created_at ? format(new Date(p.created_at), "MMM d, yyyy") : "—"}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold uppercase text-muted-foreground">{t("profile.joinedServer")}</div>
                          <div className="text-xs text-foreground">{m.joined_at ? format(new Date(m.joined_at), "MMM d, yyyy") : "—"}</div>
                        </div>
                      </div>

                      {user && m.user_id !== user.id && (
                        <>
                          <Separator className="my-3" />
                          <Input
                            placeholder={t("profile.messageUser", { name: username })}
                            className="h-8 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                const val = (e.target as HTMLInputElement).value;
                                handleQuickMessage(m.user_id, val);
                              }
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                );

                const memberButton = (
                  <button
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors w-full text-start"
                    onClick={isMobile ? () => setSelectedMemberId(m.user_id) : undefined}
                  >
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/20 text-primary text-xs">{name.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <StatusBadge status={(status === "offline" ? "invisible" : status) as UserStatus} size="sm" className="absolute bottom-0 end-0" />
                    </div>
                    <StyledDisplayName
                      displayName={name}
                      gradientStart={p?.name_gradient_start}
                      gradientEnd={p?.name_gradient_end}
                      className={`text-sm truncate ${status === "offline" || status === "invisible" ? "text-muted-foreground" : "text-foreground"}`}
                    />
                  </button>
                );

                if (isMobile) {
                  return (
                    <React.Fragment key={m.user_id}>
                      <ServerMemberContextMenu
                        targetUserId={m.user_id}
                        targetUsername={username}
                        serverId={serverId}
                        targetRole={m.role}
                        currentUserRole={currentUserRole}
                      >
                        {memberButton}
                      </ServerMemberContextMenu>
                      <Dialog open={selectedMemberId === m.user_id} onOpenChange={(open) => !open && setSelectedMemberId(null)}>
                        <DialogContent className="p-0 border-none bg-transparent max-w-[340px] overflow-hidden">
                          <DialogTitle className="sr-only">{name}</DialogTitle>
                          {profileCardContent}
                        </DialogContent>
                      </Dialog>
                    </React.Fragment>
                  );
                }

                return (
                  <Popover key={m.user_id}>
                    <ServerMemberContextMenu
                      targetUserId={m.user_id}
                      targetUsername={username}
                      serverId={serverId}
                      targetRole={m.role}
                      currentUserRole={currentUserRole}
                    >
                      <PopoverTrigger asChild>
                        {memberButton}
                      </PopoverTrigger>
                    </ServerMemberContextMenu>
                    <PopoverContent side="left" align="start" className="w-[300px] p-0 overflow-hidden rounded-lg">
                      {profileCardContent}
                    </PopoverContent>
                  </Popover>
                );
              })}
            </div>
          </div>
        ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerMemberList;
