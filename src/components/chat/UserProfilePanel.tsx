import React from "react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import type { Tables } from "@/integrations/supabase/types";
import { format, differenceInYears } from "date-fns";
import StyledDisplayName from "@/components/StyledDisplayName";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import ProfileEffectWrapper from "@/components/shared/ProfileEffectWrapper";
import StatusBubble from "@/components/shared/StatusBubble";

type Profile = Tables<"profiles">;

interface UserProfilePanelProps {
  profile: Profile | null;
  statusLabel: string;
}

const UserProfilePanel = ({ profile, statusLabel }: UserProfilePanelProps) => {
  const { t } = useTranslation();

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
      </div>
    </ProfileEffectWrapper>
  );
};

export default UserProfilePanel;
