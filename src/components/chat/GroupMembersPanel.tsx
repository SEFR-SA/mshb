import React from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import { usePresence } from "@/hooks/usePresence";
import { Users } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Profile = Tables<"profiles">;

interface GroupMembersPanelProps {
  profiles: Map<string, Profile>;
  memberRoles: Map<string, string>;
  groupName: string;
  memberCount: number;
  groupAvatarUrl?: string;
}

const GroupMembersPanel = ({ profiles, memberRoles, groupName, memberCount, groupAvatarUrl }: GroupMembersPanelProps) => {
  const { t } = useTranslation();
  const { getUserStatus } = usePresence();

  // Sort members: admins first, then alphabetically
  const sortedMembers = Array.from(profiles.entries()).sort(([aId], [bId]) => {
    const aRole = memberRoles.get(aId) || "member";
    const bRole = memberRoles.get(bId) || "member";
    if (aRole === "admin" && bRole !== "admin") return -1;
    if (bRole === "admin" && aRole !== "admin") return 1;
    const aName = (profiles.get(aId)?.display_name || profiles.get(aId)?.username || "").toLowerCase();
    const bName = (profiles.get(bId)?.display_name || profiles.get(bId)?.username || "").toLowerCase();
    return aName.localeCompare(bName);
  });

  return (
    <div className="w-72 border-s border-border/50 glass h-full overflow-y-auto">
      {/* Banner area */}
      {groupAvatarUrl ? (
        <img src={groupAvatarUrl} alt="" className="h-24 w-full object-cover rounded-b-lg" />
      ) : (
        <div className="h-24 bg-primary/20 rounded-b-lg flex items-center justify-center">
          <Users className="h-10 w-10 text-primary/40" />
        </div>
      )}

      {/* Group info card */}
      <div className="mx-4 mt-4 p-3 rounded-lg bg-card/80 border border-border/50 space-y-3">
        <div>
          <h3 className="text-lg font-bold">{groupName}</h3>
          <p className="text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5 inline me-1" />
            {t("groups.memberCount", { count: memberCount })}
          </p>
        </div>

        <Separator />

        {/* Members list */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">{t("groups.members")}</h4>
          <div className="space-y-2">
            {sortedMembers.map(([userId, profile]) => {
              const role = memberRoles.get(userId) || "member";
              const status = getUserStatus(profile);
              const displayStatus = (status === "offline" ? "invisible" : status) as UserStatus;

              return (
                <div key={userId} className="flex items-center gap-2.5">
                  <div className="relative shrink-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {(profile.display_name || profile.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="absolute bottom-0 end-0 border-2 border-background rounded-full">
                      <StatusBadge status={displayStatus} />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-medium truncate">
                        {profile.display_name || profile.username || "User"}
                      </p>
                      {role === "admin" && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {t("groups.admin")}
                        </Badge>
                      )}
                    </div>
                    {profile.username && (
                      <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupMembersPanel;
