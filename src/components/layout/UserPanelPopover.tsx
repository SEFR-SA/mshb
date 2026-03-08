import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { usePresence } from "@/hooks/usePresence";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import StyledDisplayName from "@/components/StyledDisplayName";
import { Pencil, LogOut, ChevronRight } from "lucide-react";
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
  const { getUserStatus } = usePresence();
  const navigate = useNavigate();
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const p = profile as any;
  const currentStatus = (getUserStatus(profile) || "online") as UserStatus;
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

  return (
    <div className="w-[300px] overflow-visible rounded-t-xl">
      {/* Banner */}
      <div
        className="h-24 w-full relative rounded-t-xl"
        style={
          profile.banner_url
            ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
            : { background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.6))" }
        }
      />

      {/* Avatar + Info */}
      <div className="px-3 pb-3">
        <div className="-mt-10 mb-2 flex items-end gap-2">
          <AvatarDecorationWrapper
            decorationUrl={p?.avatar_decoration_url}
            isPro={p?.is_pro}
            size={80}
          >
            <Avatar className="h-20 w-20 border-4 border-background">
              <AvatarImage src={profile.avatar_url || ""} />
              <AvatarFallback className="bg-primary/20 text-primary text-lg">
                {initials}
              </AvatarFallback>
            </Avatar>
            <StatusBadge
              status={currentStatus}
              size="md"
              className="absolute bottom-0 end-0 z-20 ring-2 ring-background"
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
          className="text-sm font-bold truncate leading-tight"
        />
        {profile.username && (
          <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
        )}

        {/* Container 1: Edit Profile + Status */}
        <div className="mt-3 rounded-md bg-muted/50 p-1 space-y-0.5">
          <button
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-xs hover:bg-accent hover:text-accent-foreground transition-colors text-start"
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
              className="flex items-center justify-between w-full px-2 py-1.5 rounded-sm text-xs hover:bg-accent hover:text-accent-foreground transition-colors text-start group"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
            >
              <span className="flex items-center gap-2">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", currentStatusOption.color)} />
                {currentStatusOption.label}
              </span>
              <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-accent-foreground" />
            </button>

            {/* Side-positioned status submenu */}
            {showStatusMenu && (
              <div className="absolute left-full top-0 ms-0 rtl:left-auto rtl:right-full z-50 ps-2 rtl:ps-0 rtl:pe-2">
                <div className="w-[200px] rounded-md border border-border bg-popover/95 backdrop-blur-xl p-1 shadow-lg -mt-6 space-y-0.5">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      className={cn(
                        "flex flex-col w-full px-2 py-1.5 rounded-sm text-xs hover:bg-accent hover:text-accent-foreground transition-colors text-start gap-0.5 group",
                        currentStatus === opt.value && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => handleStatusChange(opt.value)}
                    >
                      <span className="flex items-center gap-2">
                        <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", opt.color)} />
                        {opt.label}
                      </span>
                      {opt.description && (
                        <span className="text-[10px] text-muted-foreground group-hover:text-accent-foreground ps-[18px]">{opt.description}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Container 2: Sign Out */}
        <div className="mt-2 rounded-md bg-muted/50 p-1">
          <button
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-sm text-xs hover:bg-destructive hover:text-destructive-foreground transition-colors text-start text-destructive"
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
