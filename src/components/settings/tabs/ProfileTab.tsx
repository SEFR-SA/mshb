import React, { useState, useEffect } from "react";
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
import { Camera, ImagePlus } from "lucide-react";
import { FONT_STYLES, convertToFont, revertToPlain, type FontStyle } from "@/lib/unicodeFonts";
import StyledDisplayName from "@/components/StyledDisplayName";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";

const STATUSES: UserStatus[] = ["online", "busy", "dnd", "idle", "invisible"];
const DURATIONS = ["15m", "1h", "8h", "24h", "3d", "forever"] as const;
const DURATION_MINUTES: Record<string, number | null> = {
  "15m": 15, "1h": 60, "8h": 480, "24h": 1440, "3d": 4320, forever: null,
};
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => currentYear - i);

const ProfileTab = () => {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [statusText, setStatusText] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [status, setStatus] = useState<UserStatus>("online");
  const [statusDuration, setStatusDuration] = useState<string>("forever");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [gradientStart, setGradientStart] = useState("");
  const [gradientEnd, setGradientEnd] = useState("");
  const [selectedFont, setSelectedFont] = useState<FontStyle>("Normal");
  const [dobMonth, setDobMonth] = useState("");
  const [dobDay, setDobDay] = useState("");
  const [dobYear, setDobYear] = useState("");
  const [gender, setGender] = useState("");

  // Server Tags
  const [eligibleTags, setEligibleTags] = useState<any[]>([]);
  const [activeServerTagId, setActiveServerTagId] = useState<string>("none");

  const p = profile as any;

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setDisplayName(profile.display_name || "");
      setStatusText(profile.status_text || "");
      setAboutMe(p?.about_me || "");
      setStatus((profile as any).status as UserStatus || "online");
      setGradientStart(p?.name_gradient_start || "");
      setGradientEnd(p?.name_gradient_end || "");
      if (p?.date_of_birth) {
        const d = new Date(p.date_of_birth);
        setDobMonth(MONTHS[d.getMonth()]);
        setDobDay(String(d.getDate()));
        setDobYear(String(d.getFullYear()));
      }
      setGender(p?.gender || "");
      setActiveServerTagId(p?.active_server_tag_id || "none");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    const fetchTags = async () => {
      const { data } = await supabase
        .from("server_members" as any)
        .select("server_id, servers(id, name, server_tag_name, server_tag_badge, server_tag_color)")
        .eq("user_id", user.id);
      if (data) {
        const tags = data
          .map((row: any) => row.servers)
          .filter((s: any) => s && s.server_tag_name);
        setEligibleTags(tags);
      }
    };
    fetchTags();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    let statusUntil: string | null = null;
    if (status !== "online") {
      const mins = DURATION_MINUTES[statusDuration];
      if (mins !== null && mins !== undefined) {
        statusUntil = new Date(Date.now() + mins * 60000).toISOString();
      }
    }
    let dateOfBirth: string | null = null;
    if (dobMonth && dobDay && dobYear) {
      const monthIdx = MONTHS.indexOf(dobMonth) + 1;
      dateOfBirth = `${dobYear}-${String(monthIdx).padStart(2, "0")}-${String(Number(dobDay)).padStart(2, "0")}`;
    }
    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim() || null,
        display_name: displayName.trim() || null,
        status_text: statusText.trim(),
        about_me: aboutMe.trim(),
        status,
        status_until: status === "online" ? null : statusUntil,
        name_gradient_start: gradientStart || null,
        name_gradient_end: gradientEnd || null,
        date_of_birth: dateOfBirth,
        gender: gender || null,
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
      await refreshProfile();
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
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
    const ext = file.name.split(".").pop();
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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.myProfile")}</h2>
        <p className="text-sm text-muted-foreground">Manage your public profile information.</p>
      </div>

      {/* Banner + Avatar */}
      <div className="rounded-xl overflow-hidden border border-border/50">
        <div className="relative">
          {p?.banner_url ? (
            <img src={p.banner_url} alt="" className="h-32 w-full object-cover" />
          ) : (
            <div className="h-32 w-full bg-gradient-to-r from-primary/30 to-primary/10" />
          )}
          <label className="absolute top-2 end-2 h-8 w-8 rounded-full bg-background/80 flex items-center justify-center cursor-pointer hover:bg-background transition-colors">
            <ImagePlus className="h-4 w-4" />
            <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploading} />
          </label>
          {/* Avatar overlapping banner */}
          <div className="absolute -bottom-10 start-4">
            <div className="relative">
              <Avatar className="h-20 w-20 border-4 border-background" alwaysPlayGif>
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20 text-primary text-2xl">{initials}</AvatarFallback>
              </Avatar>
              <label className="absolute bottom-0 end-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
                <Camera className="h-3.5 w-3.5" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
          </div>
        </div>
        <div className="pt-12 pb-4 px-4">
          <StyledDisplayName
            displayName={displayName || profile?.display_name || "User"}
            gradientStart={gradientStart || null}
            gradientEnd={gradientEnd || null}
            className="font-bold text-lg"
          />
          {username && <p className="text-sm text-muted-foreground">@{username}</p>}
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("profile.username")}</Label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="bg-muted/30" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("profile.displayName")}</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="bg-muted/30" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("profile.statusText")}</Label>
          <Input value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder="What's on your mind?" className="bg-muted/30" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("status.label")}</Label>
            <Select value={status} onValueChange={(v) => { setStatus(v as UserStatus); if (v === "online") setStatusDuration("forever"); }}>
              <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover">
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={s} />
                      {t(`status.${s}`)}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {status !== "online" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("status.duration")}</Label>
              <Select value={statusDuration} onValueChange={setStatusDuration}>
                <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={d}>{t(`duration.${d}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("profile.aboutMeLabel")}</Label>
          <Textarea
            value={aboutMe}
            onChange={(e) => setAboutMe(e.target.value.slice(0, 500))}
            placeholder={t("profile.aboutMePlaceholder")}
            rows={4}
            className="bg-muted/30 resize-none"
          />
          <p className="text-xs text-muted-foreground text-end">{aboutMe.length}/500</p>
        </div>

        {/* Date of Birth */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("profile.dateOfBirth")}</Label>
          <div className="grid grid-cols-3 gap-2">
            <Select value={dobMonth} onValueChange={setDobMonth}>
              <SelectTrigger className="bg-muted/30"><SelectValue placeholder={t("profile.monthPlaceholder")} /></SelectTrigger>
              <SelectContent className="bg-popover">
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={m}>{t(`profile.months.${MONTH_KEYS[i]}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dobDay} onValueChange={setDobDay}>
              <SelectTrigger className="bg-muted/30"><SelectValue placeholder={t("profile.dayPlaceholder")} /></SelectTrigger>
              <SelectContent className="bg-popover">
                {Array.from(
                  { length: dobMonth && dobYear ? new Date(Number(dobYear), MONTHS.indexOf(dobMonth) + 1, 0).getDate() : 31 },
                  (_, i) => i + 1
                ).map((d) => (
                  <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dobYear} onValueChange={setDobYear}>
              <SelectTrigger className="bg-muted/30"><SelectValue placeholder={t("profile.yearPlaceholder")} /></SelectTrigger>
              <SelectContent className="bg-popover">
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("profile.gender")}</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger className="bg-muted/30"><SelectValue placeholder={t("profile.selectGender")} /></SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="Male">{t("profile.male")}</SelectItem>
              <SelectItem value="Female">{t("profile.female")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Server Tags */}
      <div className="border-t border-border/50 pt-6 space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("serverTags.title", "Server Tags")}</h3>
        <p className="text-xs text-muted-foreground">{t("serverTags.description", "Select a server tag to display next to your name globally.")}</p>
        <Select value={activeServerTagId} onValueChange={setActiveServerTagId}>
          <SelectTrigger className="bg-muted/30"><SelectValue placeholder="Select a tag" /></SelectTrigger>
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
                    style={{ backgroundColor: tag.server_tag_color || "#6b7280" }}
                  >
                    {tag.server_tag_badge && <span>{tag.server_tag_badge}</span>}
                    <span>{tag.server_tag_name}</span>
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Name Style */}
      <div className="border-t border-border/50 pt-6 space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("nameStyle.title")}</h3>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("nameStyle.fontStyle")}</Label>
          <div className="flex flex-wrap gap-2">
            {FONT_STYLES.map((font) => (
              <button
                key={font.id}
                onClick={() => {
                  setSelectedFont(font.id);
                  const plain = revertToPlain(displayName);
                  setDisplayName(convertToFont(plain, font.id));
                }}
                className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${selectedFont === font.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-primary/50"
                  }`}
              >
                {font.preview}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{t("nameStyle.gradientColors")}</Label>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("nameStyle.startColor")}</span>
              <label className="h-8 w-8 rounded-full border border-border cursor-pointer overflow-hidden relative">
                <div className="h-full w-full" style={{ backgroundColor: gradientStart || "#ffffff" }} />
                <input type="color" value={gradientStart || "#ffffff"} onChange={(e) => setGradientStart(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t("nameStyle.endColor")}</span>
              <label className="h-8 w-8 rounded-full border border-border cursor-pointer overflow-hidden relative">
                <div className="h-full w-full" style={{ backgroundColor: gradientEnd || "#ffffff" }} />
                <input type="color" value={gradientEnd || "#ffffff"} onChange={(e) => setGradientEnd(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
              </label>
            </div>
            {(gradientStart || gradientEnd) && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setGradientStart(""); setGradientEnd(""); }}>
                {t("nameStyle.clearGradient")}
              </Button>
            )}
          </div>
          <div className="p-3 rounded-lg bg-muted/30 border border-border/50 mt-2">
            <StyledDisplayName
              displayName={displayName || "Your Name"}
              gradientStart={gradientStart || null}
              gradientEnd={gradientEnd || null}
              className="text-lg font-bold"
            />
          </div>
        </div>
      </div>

      <div className="pt-2">
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? t("common.loading") : t("profile.save")}
        </Button>
      </div>
    </div>
  );
};

export default ProfileTab;
