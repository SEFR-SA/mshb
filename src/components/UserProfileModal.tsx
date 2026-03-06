import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useDirectCall } from "@/hooks/useDirectCall";
import { useIsMobile } from "@/hooks/use-mobile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { MessageSquare, Phone } from "lucide-react";
import { format } from "date-fns";
import type { Tables } from "@/integrations/supabase/types";
import StyledDisplayName from "@/components/StyledDisplayName";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";
import ProfileEffectWrapper from "@/components/shared/ProfileEffectWrapper";

type Profile = Tables<"profiles">;

const UserProfileModal = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profileUserId, closeProfile } = useUserProfile();
  const { directCall } = useDirectCall();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const isOpen = !!profileUserId;
  const isSelf = profileUserId === user?.id;

  useEffect(() => {
    if (!profileUserId) { setProfile(null); return; }
    setLoading(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("user_id", profileUserId)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [profileUserId]);

  const handleMessage = async () => {
    if (!user || !profileUserId || isSelf) return;
    const [u1, u2] = [user.id, profileUserId].sort();
    const { data: existing } = await supabase
      .from("dm_threads")
      .select("id")
      .eq("user1_id", u1)
      .eq("user2_id", u2)
      .maybeSingle();
    if (existing) {
      navigate(`/chat/${existing.id}`);
    } else {
      const { data: newThread } = await supabase
        .from("dm_threads")
        .insert({ user1_id: u1, user2_id: u2 })
        .select("id")
        .single();
      if (newThread) navigate(`/chat/${newThread.id}`);
    }
    closeProfile();
  };

  const handleCall = () => {
    if (!profileUserId || isSelf) return;
    directCall(profileUserId);
    closeProfile();
  };

  const content = (
    <ProfileEffectWrapper effectUrl={(profile as any)?.profile_effect_url} isPro={(profile as any)?.is_pro} className="flex flex-col">
      {/* Banner */}
      <div
        className="h-24 md:h-32 rounded-t-lg relative"
        style={{
          background: profile?.banner_url
            ? `url(${profile.banner_url}) center/cover`
            : "hsl(var(--primary) / 0.2)",
        }}
      />

      {/* Avatar overlapping banner */}
      <div className="px-4 -mt-10 relative z-10">
        <AvatarDecorationWrapper decorationUrl={(profile as any)?.avatar_decoration_url} isPro={(profile as any)?.is_pro} size={80}>
        <Avatar className="h-20 w-20 border-4 border-popover">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="bg-primary/20 text-primary text-2xl">
            {(profile?.display_name || profile?.username || "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        </AvatarDecorationWrapper>
      </div>

      {/* Info */}
      <div className="px-4 pt-2 pb-4 space-y-4">
        {/* Name + username */}
        <div>
          <StyledDisplayName
            displayName={profile?.display_name || profile?.username || "User"}
            gradientStart={profile?.name_gradient_start}
            gradientEnd={profile?.name_gradient_end}
            className="text-xl font-bold"
          />
          {profile?.username && (
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
          )}
        </div>

        {/* Actions (not for self) */}
        {!isSelf && (
          <div className="flex gap-2">
            <Button onClick={handleMessage} className="flex-1 gap-2">
              <MessageSquare className="h-4 w-4" />
              {t("actions.message")}
            </Button>
            <Button variant="secondary" size="icon" onClick={handleCall}>
              <Phone className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* About Me */}
        {profile?.about_me && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("profile.aboutMe", "About Me")}
            </h4>
            <p className="text-sm">{profile.about_me}</p>
          </div>
        )}

        {/* Member Since */}
        {profile?.created_at && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              {t("profile.memberSince", "Member Since")}
            </h4>
            <p className="text-sm text-muted-foreground">
              {format(new Date(profile.created_at), "MMMM yyyy")}
            </p>
          </div>
        )}
      </div>
    </ProfileEffectWrapper>
  );

  if (loading && isOpen) {
    const skeleton = (
      <div className="p-8 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
    if (isMobile) {
      return (
        <Drawer open={isOpen} onOpenChange={(o) => !o && closeProfile()}>
          <DrawerContent>{skeleton}</DrawerContent>
        </Drawer>
      );
    }
    return (
      <Dialog open={isOpen} onOpenChange={(o) => !o && closeProfile()}>
        <DialogContent className="p-0 max-w-sm overflow-hidden">{skeleton}</DialogContent>
      </Dialog>
    );
  }

  if (!isOpen || !profile) return null;

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(o) => !o && closeProfile()}>
        <DrawerContent>{content}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && closeProfile()}>
      <DialogContent className="p-0 max-w-sm overflow-hidden">{content}</DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;
