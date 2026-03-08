import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import type { Tables } from "@/integrations/supabase/types";
import { format } from "date-fns";
import { ChevronDown } from "lucide-react";
import StyledDisplayName from "@/components/StyledDisplayName";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import ProfileEffectWrapper from "@/components/shared/ProfileEffectWrapper";
import StatusBubble from "@/components/shared/StatusBubble";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { supabase } from "@/integrations/supabase/client";

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

const UserProfilePanel = ({ profile, statusLabel, userId }: UserProfilePanelProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { openProfile } = useUserProfile();
  const [mutualServers, setMutualServers] = useState<MutualServer[]>([]);
  const [mutualFriends, setMutualFriends] = useState<MutualFriend[]>([]);
  const [serversOpen, setServersOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);

  const currentUserId = user?.id;
  const targetUserId = userId || profile?.user_id;
  const isSelf = currentUserId === targetUserId;

  useEffect(() => {
    if (!currentUserId || !targetUserId || isSelf) return;

    const fetchMutualServers = async () => {
      const [{ data: myServers }, { data: theirServers }] = await Promise.all([
        supabase.from("server_members").select("server_id").eq("user_id", currentUserId),
        supabase.from("server_members").select("server_id").eq("user_id", targetUserId),
      ]);
      if (!myServers || !theirServers) return;
      const myIds = new Set(myServers.map((s) => s.server_id));
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

    fetchMutualServers();
    fetchMutualFriends();
  }, [currentUserId, targetUserId, isSelf]);

  if (!profile) return null;

  const status = (statusLabel === "offline" ? "invisible" : statusLabel) as UserStatus;
  const p = profile as any;
  const effectiveStatusText =
    p?.status_until && new Date(p.status_until) < new Date() ? null : (p?.status_text ?? null);

  return (
    <ProfileEffectWrapper
      effectUrl={p?.profile_effect_url}
      isPro={p?.is_pro}
      className="w-72 border-s border-border/50 glass h-full overflow-y-auto"
    >
      {/* Banner area */}
      {p.banner_url ? (
        <img src={p.banner_url} alt="" className="h-24 w-full object-cover rounded-b-lg" />
      ) : (
        <div className="h-24 bg-primary/20 rounded-b-lg" />
      )}

      {/* Avatar + Status Bubble row */}
      <div className="px-4 -mt-16 flex items-end gap-2">
        <AvatarDecorationWrapper
          decorationUrl={p?.avatar_decoration_url}
          isPro={p?.is_pro}
          size={90}
          className="shrink-0"
        >
          <Avatar className="h-[80px] w-[80px] border-4 border-background">
            <AvatarImage src={profile.avatar_url || ""} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl">
              {(profile.display_name || profile.username || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <StatusBadge status={status} size="md" className="absolute bottom-1 end-1 z-20" />
        </AvatarDecorationWrapper>
        <StatusBubble statusText={effectiveStatusText} />
      </div>

      {/* Profile card */}
      <div className="mx-4 mt-3 p-3 rounded-lg bg-card/80 border border-border/50 space-y-3">
        <div>
          <StyledDisplayName
            displayName={profile.display_name || profile.username || "User"}
            fontStyle={p?.name_font}
            effect={p?.name_effect}
            gradientStart={p?.name_gradient_start}
            gradientEnd={p?.name_gradient_end}
            className="text-lg font-bold"
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
          {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
        </div>

        {/* Status */}
        <div className="flex items-center gap-2">
          <StatusBadge status={status} size="sm" />
          <span className="text-sm capitalize">
            {t(`status.${statusLabel !== "offline" ? statusLabel : "invisible"}`)}
          </span>
        </div>

        {/* About Me */}
        {p.about_me && (
          <>
            <Separator />
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">{t("profile.aboutMe")}</h4>
              <p className="text-sm whitespace-pre-wrap">{p.about_me}</p>
            </div>
          </>
        )}

        <Separator />

        {/* Member Since */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1">{t("profile.memberSince")}</h4>
          <p className="text-sm">{format(new Date(profile.created_at), "MMM d, yyyy")}</p>
        </div>

        {/* Mutual Servers */}
        {!isSelf && (
          <>
            <Separator />
            <Collapsible open={serversOpen} onOpenChange={setServersOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-xs font-semibold text-muted-foreground uppercase cursor-pointer hover:text-foreground transition-colors">
                <span>{t("profile.mutualServers", "Mutual Servers")} — {mutualServers.length}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${serversOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1.5 pt-1.5">
                {mutualServers.map((server) => (
                  <div key={server.id} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent/50 transition-colors">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={server.icon_url || ""} />
                      <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                        {server.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{server.name}</span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* Mutual Friends */}
        {!isSelf && mutualFriends.length > 0 && (
          <>
            <Separator />
            <Collapsible open={friendsOpen} onOpenChange={setFriendsOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between py-1 text-xs font-semibold text-muted-foreground uppercase cursor-pointer hover:text-foreground transition-colors">
                <span>{t("profile.mutualFriends", "Mutual Friends")} — {mutualFriends.length}</span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${friendsOpen ? "rotate-180" : ""}`} />
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-1.5 pt-1.5">
                {mutualFriends.map((friend) => (
                  <div key={friend.user_id} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-accent/50 transition-colors">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={friend.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                        {(friend.display_name || friend.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{friend.display_name || friend.username}</span>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* View Full Profile */}
        {targetUserId && (
          <>
            <Separator />
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => openProfile(targetUserId)}
            >
              {t("profile.viewFullProfile", "View Full Profile")}
            </Button>
          </>
        )}
      </div>
    </ProfileEffectWrapper>
  );
};

export default UserProfilePanel;
