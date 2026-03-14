import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImagePlus, Palette } from "lucide-react";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import StyledDisplayName from "@/components/StyledDisplayName";
import DisplayNameStyleModal from "@/components/settings/DisplayNameStyleModal";
import SetStatusModal from "@/components/settings/SetStatusModal";
import ServerTagBadgeIcon from "@/components/ServerTagBadgeIcon";
import StatusBubble from "@/components/shared/StatusBubble";
import DecorationSelector from "@/components/settings/DecorationSelector";
import NameplateSelector from "@/components/settings/NameplateSelector";
import EffectSelector from "@/components/settings/EffectSelector";
import ProfileEffectWrapper from "@/components/shared/ProfileEffectWrapper";
import NameplateWrapper from "@/components/shared/NameplateWrapper";
import AvatarDecorationWrapper from "@/components/shared/AvatarDecorationWrapper";

const ProfileTab = ({ setUnsaved, clearUnsaved }: { setUnsaved?: any; clearUnsaved?: any }) => {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();

  const [username, setUsername]           = useState("");
  const [displayName, setDisplayName]     = useState("");
  const [aboutMe, setAboutMe]             = useState("");
  const [saving, setSaving]               = useState(false);
  const [uploading, setUploading]         = useState(false);
  const [styleModalOpen, setStyleModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [eligibleTags, setEligibleTags]   = useState<any[]>([]);
  const [activeServerTagId, setActiveServerTagId] = useState<string>("none");

  const isPro = (profile as any)?.is_pro ?? false;
  const p     = profile as any;

  const originalRef = useRef<any>(null);

  useEffect(() => {
    if (profile) {
      const values = {
        username:          profile.username || "",
        displayName:       profile.display_name || "",
        aboutMe:           p?.about_me || "",
        activeServerTagId: p?.active_server_tag_id || "none",
      };
      setUsername(values.username);
      setDisplayName(values.displayName);
      setAboutMe(values.aboutMe);
      setActiveServerTagId(values.activeServerTagId);
      originalRef.current = values;
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("server_members" as any)
      .select("server_id, servers(id, name, server_tag_name, server_tag_badge, server_tag_color, server_tag_container_color)")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (data) {
          setEligibleTags(
            data.map((row: any) => row.servers).filter((s: any) => s && s.server_tag_name)
          );
        }
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name:         displayName.trim() || null,
        about_me:             aboutMe.trim(),
        active_server_tag_id: activeServerTagId === "none" ? null : activeServerTagId,
      } as any)
      .eq("user_id", user.id);

    if (error) {
      const msg =
        error.message?.includes("profile_username_key") || error.message?.includes("unique constraint")
          ? t("auth.usernameTaken")
          : error.message;
      toast({ title: t("common.error"), description: msg, variant: "destructive" });
    } else {
      toast({ title: t("profile.saved") });
      originalRef.current = {
        username:          username.trim() || "",
        displayName:       displayName.trim() || "",
        aboutMe:           aboutMe.trim(),
        activeServerTagId: activeServerTagId === "none" ? "none" : activeServerTagId,
      };
      clearUnsaved?.();
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleReset = () => {
    if (!originalRef.current) return;
    setUsername(originalRef.current.username);
    setDisplayName(originalRef.current.displayName);
    setAboutMe(originalRef.current.aboutMe);
    setActiveServerTagId(originalRef.current.activeServerTagId);
    clearUnsaved?.();
  };

  const isDirty =
    originalRef.current !== null && (
      username          !== originalRef.current.username          ||
      displayName       !== originalRef.current.displayName       ||
      aboutMe           !== originalRef.current.aboutMe           ||
      activeServerTagId !== originalRef.current.activeServerTagId
    );

  const saveFnRef  = useRef(handleSave);
  const resetFnRef = useRef(handleReset);
  useEffect(() => {
    saveFnRef.current  = handleSave;
    resetFnRef.current = handleReset;
  });

  useEffect(() => {
    if (!setUnsaved || !clearUnsaved) return;
    if (isDirty) {
      setUnsaved(() => saveFnRef.current(), () => resetFnRef.current());
    } else {
      clearUnsaved();
    }
  }, [isDirty]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!isPro && file.type === "image/gif") {
      toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast"), variant: "destructive" });
      e.target.value = "";
      return;
    }
    setUploading(true);
    const ext  = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: t("common.error"), description: uploadError.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
      await refreshProfile();
    }
    setUploading(false);
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext  = file.name.split(".").pop();
    const path = `${user.id}/banner.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: t("common.error"), description: uploadError.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ banner_url: urlData.publicUrl } as any).eq("user_id", user.id);
      await refreshProfile();
    }
    setUploading(false);
  };

  const initials = (profile?.display_name || profile?.username || user?.email || "?").charAt(0).toUpperCase();

  const nameStyleProps = {
    displayName:   displayName || "User",
    fontStyle:     p?.name_font,
    effect:        p?.name_effect,
    gradientStart: p?.name_gradient_start || null,
    gradientEnd:   p?.name_gradient_end || null,
    color:         p?.name_effect && p.name_effect !== "Gradient" ? p.name_gradient_start : null,
  };

  return (
    <div className="space-y-4">
      {/* Page heading */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.myProfile")}</h2>
        <p className="text-sm text-muted-foreground">Manage your public profile information.</p>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">

        {/* ── LEFT COLUMN — form controls ── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Username (read-only — change in Account tab) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{t("profile.username")}</Label>
            <Input value={username} readOnly disabled className="bg-muted/40 opacity-60 cursor-not-allowed" />
            <p className="text-xs text-muted-foreground">{t("settings.usernameChangeNote", "Username can only be changed from the Account tab.")}</p>
          </div>
          </div>

          {/* Display Name + Style buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{t("profile.displayName")}</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-muted/40" />
            <div className="flex items-center gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  if (!isPro) {
                    toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast") });
                    return;
                  }
                  setStyleModalOpen(true);
                }}
              >
                <Palette className="h-3.5 w-3.5 mr-1.5" />
                {t("nameStyle.changeStyle")}
              </Button>
              {(p?.name_gradient_start || p?.name_font || p?.name_effect) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground"
                  onClick={async () => {
                    await supabase.from("profiles").update({
                      name_font: null, name_effect: null,
                      name_gradient_start: null, name_gradient_end: null,
                    } as any).eq("user_id", user!.id);
                    await refreshProfile();
                    toast({ title: t("nameStyle.styleRemoved") });
                  }}
                >
                  {t("nameStyle.removeStyle")}
                </Button>
              )}
            </div>
            {styleModalOpen && (
              <DisplayNameStyleModal
                onClose={() => setStyleModalOpen(false)}
                onApplied={async () => {
                  await refreshProfile();
                  setStyleModalOpen(false);
                }}
              />
            )}
            {statusModalOpen && (
              <SetStatusModal
                onClose={() => setStatusModalOpen(false)}
                onSaved={async () => { await refreshProfile(); setStatusModalOpen(false); }}
              />
            )}
          </div>

          {/* Avatar Decoration */}
          <div className="border-t border-border/50 pt-4">
            <DecorationSelector />
          </div>

          {/* Nameplate */}
          <div className="border-t border-border/50 pt-4">
            <NameplateSelector />
          </div>

          {/* Profile Effect */}
          <div className="border-t border-border/50 pt-4">
            <EffectSelector />
          </div>

          {/* About Me */}
          <div className="border-t border-border/50 pt-4 space-y-1.5">
            <Label className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">{t("profile.aboutMeLabel")}</Label>
            <Textarea
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value.slice(0, 500))}
              placeholder={t("profile.aboutMePlaceholder")}
              rows={4}
              className="bg-muted/40 resize-none"
            />
            <p className="text-xs text-muted-foreground text-end">{aboutMe.length}/500</p>
          </div>

          {/* Server Tags */}
          <div className="border-t border-border/50 pt-4 space-y-3">
            <div>
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-muted-foreground">{t("serverTags.title", "Server Tags")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("serverTags.description", "Select a server tag to display next to your name globally.")}</p>
            </div>
            <Select value={activeServerTagId} onValueChange={setActiveServerTagId}>
              <SelectTrigger className="bg-muted/40"><SelectValue placeholder="Select a tag" /></SelectTrigger>
              <SelectContent className="bg-popover">
                <SelectItem value="none">
                  <span className="text-muted-foreground">{t("serverTags.none", "None")}</span>
                </SelectItem>
                {eligibleTags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center gap-2">
                      <span>{tag.name}</span>
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white inline-flex items-center gap-1"
                        style={{ backgroundColor: tag.server_tag_container_color || tag.server_tag_color || "#6b7280" }}
                      >
                        <ServerTagBadgeIcon badgeName={tag.server_tag_badge} color={tag.server_tag_color} className="w-3 h-3 shrink-0" />
                        <span>{tag.server_tag_name}</span>
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>

        {/* ── RIGHT COLUMN — sticky live preview ── */}
        <div className="w-full lg:w-[300px] shrink-0 sticky top-6 self-start space-y-4">

          {/* Preview 1: Profile Card */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70 mb-2">
              {t("nameStyle.previewTitle")}
            </p>
            <div className="rounded-xl overflow-hidden border border-border/50">
              {/* Banner — click to upload */}
              <ProfileEffectWrapper effectUrl={p?.profile_effect_url} isPro={isPro}>
                <label className="block relative cursor-pointer group">
                  {p?.banner_url
                    ? <img src={p.banner_url} alt="" className="h-24 w-full object-cover" />
                    : <div className="h-24 w-full bg-gradient-to-r from-primary/30 to-primary/10" />}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ImagePlus className="h-5 w-5 text-white" />
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploading} />
                </label>

              {/* Body */}
              <div className="px-4 pb-4 pt-0 relative">
                {/* Avatar + Status Bubble row */}
                <div className="-mt-10 mb-2 flex items-end gap-2">
                  <label className="cursor-pointer relative inline-block group shrink-0">
                    <AvatarDecorationWrapper decorationUrl={p?.avatar_decoration_url} isPro={isPro} size={80}>
                      <Avatar className="h-20 w-20 border-4 border-background" alwaysPlayGif>
                        <AvatarImage src={profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-primary/20 text-primary text-2xl">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                        <ImagePlus className="h-5 w-5 text-white" />
                      </div>
                      <StatusBadge status={(p?.status || "online") as UserStatus} size="md" className="absolute bottom-0 end-0 z-20" />
                    </AvatarDecorationWrapper>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                  </label>
                  <StatusBubble
                    statusText={p?.status_text || null}
                    isEditable
                    onClick={() => setStatusModalOpen(true)}
                  />
                </div>
                <StyledDisplayName {...nameStyleProps} className="font-bold text-base" />
                {username && <p className="text-xs text-muted-foreground mt-0.5">@{username}</p>}
                {aboutMe && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">{aboutMe}</p>
                )}
              </div>
              </ProfileEffectWrapper>
            </div>
          </div>

          {/* Preview 2: Nameplate Row */}
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70 mb-2">
              Nameplate
            </p>
            <div className="rounded-xl overflow-hidden border border-border/50 p-1">
              <NameplateWrapper nameplateUrl={p?.nameplate_url} isPro={isPro} className="rounded-lg">
                <div className="flex items-center gap-2.5 p-2.5">
                  <AvatarDecorationWrapper decorationUrl={p?.avatar_decoration_url} isPro={isPro} size={32} className="shrink-0">
                    <Avatar className="h-8 w-8" alwaysPlayGif>
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm">{initials}</AvatarFallback>
                    </Avatar>
                  </AvatarDecorationWrapper>
                  <StyledDisplayName {...nameStyleProps} className="text-sm font-medium truncate" />
                </div>
              </NameplateWrapper>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ProfileTab;
