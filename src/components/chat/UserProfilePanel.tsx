import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ChevronDown, MoreHorizontal, UserPlus, Ban, Flag } from "lucide-react";
import StyledDisplayName from "@/components/StyledDisplayName";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import ProfileEffectWrapper from "@/components/shared/ProfileEffectWrapper";
import StatusBubble from "@/components/shared/StatusBubble";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { useBlockUser } from "@/hooks/useBlockUser";
import { getAppBaseUrl } from "@/lib/inviteUtils";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReportUserDialog from "./ReportUserDialog";

type Profile = Tables<"profiles">;

interface UserProfilePanelProps {
  profile: Profile | null;
  statusLabel: string;
  userId?: string;
}

interface MutualServer {
  id: string;
  name: string;
  icon_url: string | null;
}

interface MutualFriend {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
}

interface MyServer {
  id: string;
  name: string;
  icon_url: string | null;
}

const UserProfilePanel = ({ profile, statusLabel, userId }: UserProfilePanelProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { openProfile } = useUserProfile();
  const { blockUser, unblockUser, isBlocked } = useBlockUser();

  const [mutualServers, setMutualServers] = useState<MutualServer[]>([]);
  const [mutualFriends, setMutualFriends] = useState<MutualFriend[]>([]);
  const [myServers, setMyServers] = useState<MyServer[]>([]);
  const [serversOpen, setServersOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const currentUserId = user?.id;
  const targetUserId = userId || profile?.user_id;
  const isSelf = currentUserId === targetUserId;

  useEffect(() => {
    if (!currentUserId || !targetUserId || isSelf) return;

    const fetchMutualServers = async () => {
      const [{ data: myServersData }, { data: theirServers }] = await Promise.all([
        supabase.from("server_members").select("server_id").eq("user_id", currentUserId),
        supabase.from("server_members").select("server_id").eq("user_id", targetUserId),
      ]);
      if (!myServersData || !theirServers) return;
      const myIds = new Set(myServersData.map((s) => s.server_id));
      const commonIds = theirServers.map((s) => s.server_id).filter((id) => myIds.has(id));
      if (commonIds.length === 0) { setMutualServers([]); return; }
      const { data: servers } = await supabase
        .from("servers")
        .select("id, name, icon_url")
        .in("id", commonIds);
      setMutualServers((servers as MutualServer[]) || []);
    };

    const fetchMutualFriends = async () => {
      const [{ data: myFriends }, { data: theirFriends }] = await Promise.all([
        supabase.from("friendships").select("requester_id, addressee_id").eq("status", "accepted").or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`),
        supabase.from("friendships").select("requester_id, addressee_id").eq("status", "accepted").or(`requester_id.eq.${targetUserId},addressee_id.eq.${targetUserId}`),
      ]);
      if (!myFriends || !theirFriends) return;
      const getOther = (f: any, uid: string) => f.requester_id === uid ? f.addressee_id : f.requester_id;
      const myFriendIds = new Set(myFriends.map((f) => getOther(f, currentUserId)));
      const theirFriendIds = theirFriends.map((f) => getOther(f, targetUserId));
      const commonIds = theirFriendIds.filter((id) => myFriendIds.has(id));
      if (commonIds.length === 0) { setMutualFriends([]); return; }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, avatar_url")
        .in("user_id", commonIds);
      setMutualFriends((profiles as MutualFriend[]) || []);
    };

    const fetchMyServers = async () => {
      const { data } = await supabase
        .from("server_members" as any)
        .select("servers(id, name, icon_url)")
        .eq("user_id", currentUserId);
      if (data) {
        setMyServers((data as any[]).map((m) => m.servers).filter(Boolean));
      }
    };

    fetchMutualServers();
    fetchMutualFriends();
    fetchMyServers();
  }, [currentUserId, targetUserId, isSelf]);

  const handleSendInvite = async (serverId: string, serverName: string) => {
    if (!user || !targetUserId) return;

    // Reuse a non-expired invite or create a new one
    const { data: existing } = await supabase
      .from("invites" as any)
      .select("code")
      .eq("server_id", serverId)
      .eq("creator_id", user.id)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let code = (existing as any)?.code as string | undefined;
    if (!code) {
      const { data: newInvite, error } = await supabase
        .from("invites" as any)
        .insert({ server_id: serverId, creator_id: user.id } as any)
        .select("code")
        .single();
      if (error) { toast({ title: t("common.error"), variant: "destructive" }); return; }
      code = (newInvite as any).code as string;
    }

    // Find or create a DM thread with the target user
    const { data: thread } = await supabase
      .from("dm_threads")
      .select("id")
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetUserId}),and(user1_id.eq.${targetUserId},user2_id.eq.${user.id})`)
      .maybeSingle();

    let threadId: string | undefined = (thread as any)?.id;
    if (!threadId) {
      const { data: newThread } = await supabase
        .from("dm_threads")
        .insert({ user1_id: user.id, user2_id: targetUserId })
        .select("id")
        .single();
      threadId = (newThread as any)?.id;
    }
    if (!threadId) { toast({ title: t("common.error"), variant: "destructive" }); return; }

    const baseUrl = getAppBaseUrl();
    await supabase.from("messages").insert({
      thread_id: threadId,
      author_id: user.id,
      content:   `${baseUrl}/invite/${code}`,
      type:      "server_invite",
      metadata:  { server_id: serverId, invite_code: code, server_name: serverName },
    } as any);

    toast({ title: t("inviteToServer.sent") });
  };

  if (!profile) return null;

  const status = (statusLabel === "offline" ? "invisible" : statusLabel) as UserStatus;
  const p = profile as any;
  const effectiveStatusText =
    p?.status_until && new Date(p.status_until) < new Date() ? null : (p?.status_text ?? null);

  const profileThemeVars = {
    "--profile-primary": p?.profile_primary_color ?? "hsl(var(--primary))",
    "--profile-accent":  p?.profile_accent_color  ?? "hsl(var(--primary)/0.6)",
  } as React.CSSProperties;

  return (
    <ProfileEffectWrapper
      effectUrl={p?.profile_effect_url}
      isPro={p?.is_pro}
      className="relative w-[340px] border-s border-border/50 h-full flex flex-col overflow-hidden"
    >
      {/* L1: Full-bleed gradient */}
      <div className="absolute inset-0" style={{ ...profileThemeVars, background: "linear-gradient(135deg, var(--profile-primary), var(--profile-accent))" }} />
      {/* L2: Dark wash */}
      <div className="absolute inset-0 bg-black/60 z-[1]" />

      <div className="relative z-[2] flex-1 overflow-y-auto min-h-0">
        {/* Banner area — relative wrapper for the three-dots button */}
        <div className="relative">
          {p.banner_url ? (
            <img src={p.banner_url} alt="" className="w-[340px] h-[120px] object-cover rounded-b-lg" />
          ) : (
            <div className="w-[340px] h-[120px] rounded-b-lg bg-white/5" />
          )}

          {/* Three-dots menu — only shown for other users */}
          {!isSelf && targetUserId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 end-2 h-8 w-8 bg-background/60 backdrop-blur-sm hover:bg-background/80"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">

                {/* Invite to Server submenu */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <UserPlus className="h-4 w-4 me-2" />
                    {t("inviteToServer.title")}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {myServers.length === 0 ? (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">
                        {t("inviteToServer.noServers")}
                      </p>
                    ) : (
                      myServers.map((s) => (
                        <DropdownMenuItem
                          key={s.id}
                          onClick={() => handleSendInvite(s.id, s.name)}
                        >
                          <Avatar className="h-5 w-5 me-2 shrink-0">
                            <AvatarImage src={s.icon_url || ""} />
                            <AvatarFallback className="text-[10px]">
                              {s.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate">{s.name}</span>
                        </DropdownMenuItem>
                      ))
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                {/* Block / Unblock */}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() =>
                    isBlocked(targetUserId) ? unblockUser(targetUserId) : blockUser(targetUserId)
                  }
                >
                  <Ban className="h-4 w-4 me-2" />
                  {isBlocked(targetUserId) ? t("common.unblock") : t("common.block")}
                </DropdownMenuItem>

                {/* Report */}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setReportOpen(true)}
                >
                  <Flag className="h-4 w-4 me-2" />
                  {t("report.user.menuItem")}
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Avatar + Status Bubble row */}
        <div className="px-4 -mt-16 flex items-end gap-2">
          <button
            type="button"
            className="cursor-pointer hover:opacity-90 transition-opacity shrink-0"
            onClick={() => targetUserId && openProfile(targetUserId)}
          >
            <AvatarDecorationWrapper
              decorationUrl={p?.avatar_decoration_url}
              isPro={p?.is_pro}
              size={90}
            >
              <Avatar className="h-[80px] w-[80px] border-4 border-background">
                <AvatarImage src={profile.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                  {(profile.display_name || profile.username || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <StatusBadge status={status} size="md" className="absolute bottom-1 end-1 z-20" />
            </AvatarDecorationWrapper>
          </button>
          <StatusBubble statusText={effectiveStatusText} />
        </div>

        {/* Profile card */}
        <div className="mx-4 mt-3 p-3 rounded-lg bg-white/10 border border-white/20 space-y-3">
          <div>
            <StyledDisplayName
              displayName={profile.display_name || profile.username || "User"}
              fontStyle={p?.name_font}
              effect={p?.name_effect}
              gradientStart={p?.name_gradient_start}
              gradientEnd={p?.name_gradient_end}
              className="text-lg font-bold text-white"
              serverTag={
                p?.active_server_tag
                  ? {
                      name: p.active_server_tag.server_tag_name,
                      badge: p.active_server_tag.server_tag_badge,
                      color:
                        (p.active_server_tag as any).server_tag_container_color ?? p.active_server_tag.server_tag_color,
                      badgeColor: p.active_server_tag.server_tag_color,
                    }
                  : null
              }
            />
            {profile.username && <p className="text-sm text-white/70">@{profile.username}</p>}
          </div>

          {/* Status */}
          <div className="flex items-center gap-2">
            <StatusBadge status={status} size="sm" />
            <span className="text-sm capitalize text-white/80">
              {t(`status.${statusLabel !== "offline" ? statusLabel : "invisible"}`)}
            </span>
          </div>

          {/* About Me */}
          {p.about_me && (
            <>
              <Separator className="bg-white/20" />
              <div>
                <h4 className="text-xs font-semibold text-white/50 uppercase mb-1">{t("profile.aboutMe")}</h4>
                <p className="text-sm text-white/90 whitespace-pre-wrap">{p.about_me}</p>
              </div>
            </>
          )}

          <Separator className="bg-white/20" />

          {/* Member Since */}
          <div>
            <h4 className="text-xs font-semibold text-white/50 uppercase mb-1">{t("profile.memberSince")}</h4>
            <p className="text-sm text-white/80">{format(new Date(profile.created_at), "MMM d, yyyy")}</p>
          </div>

          {/* Mutual Servers */}
          {!isSelf && (
            <>
              <Separator className="bg-white/20" />
              <Collapsible open={serversOpen} onOpenChange={setServersOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-xs font-semibold text-white/50 uppercase cursor-pointer hover:text-white transition-colors">
                  <span>{t("profile.mutualServers", "Mutual Servers")} — {mutualServers.length}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${serversOpen ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1.5 pt-1.5">
                  {mutualServers.map((server) => (
                    <div key={server.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/10 transition-colors">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={server.icon_url || ""} />
                        <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                          {server.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate text-white/80">{server.name}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}

          {/* Mutual Friends */}
          {!isSelf && (
            <>
              <Separator className="bg-white/20" />
              <Collapsible open={friendsOpen} onOpenChange={setFriendsOpen}>
                <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-xs font-semibold text-white/50 uppercase cursor-pointer hover:text-white transition-colors">
                  <span>{t("profile.mutualFriends", "Mutual Friends")} — {mutualFriends.length}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${friendsOpen ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1.5 pt-1.5">
                  {mutualFriends.map((friend) => (
                    <div key={friend.user_id} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/10 transition-colors">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={friend.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                          {(friend.display_name || friend.username || "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate text-white/80">{friend.display_name || friend.username}</span>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </>
          )}
        </div>
      </div>

      {/* View Full Profile — pinned footer */}
      {targetUserId && (
        <div className="relative z-[2] shrink-0 px-4 py-3 border-t border-white/20">
          <Button
            variant="ghost"
            className="w-full text-sm text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => openProfile(targetUserId)}
          >
            {t("profile.viewFullProfile", "View Full Profile")}
          </Button>
        </div>
      )}

      {/* Report Dialog */}
      {!isSelf && targetUserId && (
        <ReportUserDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          targetUserId={targetUserId}
          targetProfile={{
            display_name: profile.display_name,
            username: profile.username,
            avatar_url: profile.avatar_url,
          }}
        />
      )}
    </ProfileEffectWrapper>
  );
};

export default UserProfilePanel;
