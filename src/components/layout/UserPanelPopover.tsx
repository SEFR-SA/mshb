import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import StyledDisplayName from "@/components/StyledDisplayName";
import { Pencil, LogOut, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import StatusBubble from "@/components/shared/StatusBubble";

const STATUS_OPTIONS: { value: UserStatus; label: string; color: string; description?: string }[] = [
  { value: "online", label: "Online", color: "bg-green-500" },
  { value: "idle", label: "Idle", color: "bg-yellow-500" },
  { value: "busy", label: "Busy", color: "bg-red-500", description: "You will still receive notifications" },
  { value: "dnd", label: "Do Not Disturb", color: "bg-red-700", description: "You will not receive notifications" },
  { value: "invisible", label: "Invisible", color: "bg-gray-400", description: "You will appear offline" },
];

interface UserPanelPopoverProps {
  onClose?: () => void;
}

const UserPanelPopover = ({ onClose }: UserPanelPopoverProps) => {
  const { t } = useTranslation();
  const { user, profile, refreshProfile, signOut } = useAuth();
  const isMobile = useIsMobile();
  
  const navigate = useNavigate();
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const p = profile as any;
  const currentStatus = (p?.status || "online") as UserStatus;
  const effectiveStatusText = (p?.status_until && new Date(p.status_until) < new Date())
    ? null
    : p?.status_text ?? null;

  const handleStatusChange = async (newStatus: UserStatus) => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ status: newStatus } as any)
      .eq("user_id", user.id);
    await refreshProfile();
    setShowStatusMenu(false);
  };

  const handleEditProfile = () => {
    onClose?.();
    navigate("/settings");
  };

  const handleSignOut = async () => {
    onClose?.();
    await signOut();
  };

  if (!user || !profile) return null;

  const initials = (profile.display_name || profile.username || user.email || "?")
    .charAt(0)
    .toUpperCase();

  const currentStatusOption = STATUS_OPTIONS.find((s) => s.value === currentStatus) || STATUS_OPTIONS[0];

  const profileThemeVars = {
    "--profile-primary": p?.profile_primary_color ?? "hsl(var(--primary))",
    "--profile-accent":  p?.profile_accent_color  ?? "hsl(var(--primary)/0.6)",
  } as React.CSSProperties;

  return (
    <div
      className="relative w-[300px] min-h-[391px] overflow-visible rounded-xl"
      style={{ ...profileThemeVars, borderColor: "var(--profile-accent)", borderWidth: "2px", borderStyle: "solid" }}
    >
      {/* L1: Full-bleed gradient */}
      <div className="absolute inset-0 rounded-xl" style={{ background: "linear-gradient(135deg, var(--profile-primary), var(--profile-accent))" }} />
      {/* L2: Dark wash */}
      <div className="absolute inset-0 rounded-xl bg-black/60 z-[1]" />

      {/* Banner — z-[2] */}
      <div className="relative h-24 w-full z-[2] rounded-t-xl overflow-hidden">
        {profile.banner_url && (
          <img src={profile.banner_url} alt="" className="w-full h-full object-cover" />
        )}
      </div>

      {/* Avatar + Info — z-[2] */}
      <div className="relative px-3 pb-3 z-[2]">
        <div className="-mt-10 mb-2 flex items-end gap-2">
          <AvatarDecorationWrapper
            decorationUrl={p?.avatar_decoration_url}
            isPro={p?.is_pro}
            size={80}
          >
            <Avatar className="h-20 w-20 border-4 border-black/30">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <StatusBadge
              status={currentStatus}
              size="md"
              className="absolute bottom-0 end-0 z-20 translate-x-[2px] translate-y-[2px]"
            />
          </AvatarDecorationWrapper>
          <StatusBubble statusText={effectiveStatusText} />
        </div>

        {/* Name */}
        <StyledDisplayName
          displayName={profile.display_name || profile.username || "User"}
          fontStyle={p?.name_font}
          effect={p?.name_effect}
          gradientStart={p?.name_gradient_start}
          gradientEnd={p?.name_gradient_end}
          className="text-sm font-bold truncate leading-tight text-white"
        />
        {profile.username && (
          <p className="text-xs text-white/70 truncate">@{profile.username}</p>
        )}

        {/* Container 1: Edit Profile + Status */}
        <div className="mt-3 rounded-md bg-black/40 backdrop-blur-sm px-1 space-y-0.5 w-[268px] h-[99px] mx-auto flex flex-col items-stretch justify-center">
          <button
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors text-start"
            onClick={handleEditProfile}
          >
            <Pencil className="h-3.5 w-3.5 shrink-0" />
            {t("profile.editProfile", "Edit Profile")}
          </button>

          {/* Status row with side submenu */}
          <div
            className="relative"
            onMouseEnter={() => setShowStatusMenu(true)}
            onMouseLeave={() => setShowStatusMenu(false)}
          >
            <button
              className="flex items-center justify-between w-full px-2 py-1.5 rounded-sm text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors text-start group"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
            >
              <span className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", currentStatusOption.color)} />
                {currentStatusOption.label}
              </span>
              {isMobile
                ? (showStatusMenu ? <ChevronUp className="h-3 w-3 text-white/50 group-hover:text-white" /> : <ChevronDown className="h-3 w-3 text-white/50 group-hover:text-white" />)
                : <ChevronRight className="h-3 w-3 text-white/50 group-hover:text-white" />
              }
            </button>

            {/* Mobile: inline status list */}
            {showStatusMenu && isMobile && (
              <div className="mt-0.5 rounded-md border border-white/10 bg-black/80 backdrop-blur-xl p-1 space-y-0.5">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={cn(
                      "flex flex-col w-full px-2 py-1.5 rounded-sm text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors text-start gap-0.5 group",
                      currentStatus === opt.value && "bg-white/10 text-white"
                    )}
                    onClick={() => handleStatusChange(opt.value)}
                  >
                    <span className="flex items-center gap-2">
                      <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", opt.color)} />
                      {opt.label}
                    </span>
                    {opt.description && (
                      <span className="text-[10px] text-white/50 group-hover:text-white/70 ps-[18px]">{opt.description}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Desktop: side-positioned status submenu */}
            {showStatusMenu && !isMobile && (
              <div className="absolute left-full bottom-0 ms-0 rtl:left-auto rtl:right-full z-50 ps-2 rtl:ps-0 rtl:pe-2">
                <div className="w-[200px] rounded-md border border-white/10 bg-black/80 backdrop-blur-xl p-1 shadow-lg space-y-0.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={cn(
                        "flex flex-col w-full px-2 py-1.5 rounded-sm text-xs text-white/80 hover:text-white hover:bg-white/10 transition-colors text-start gap-0.5 group",
                        currentStatus === opt.value && "bg-white/10 text-white"
                      )}
                      onClick={() => handleStatusChange(opt.value)}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", opt.color)} />
                        {opt.label}
                      </span>
                      {opt.description && (
                        <span className="text-[10px] text-white/50 group-hover:text-white/70 ps-[18px]">{opt.description}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Container 2: Sign Out */}
        <div className="mt-2 rounded-md bg-black/40 backdrop-blur-sm p-1 w-[268px] h-[50px] mx-auto flex flex-col justify-center">
          <button
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-start"
            onClick={handleSignOut}
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            {t("auth.signOut", "Sign Out")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserPanelPopover;
