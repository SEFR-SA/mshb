import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, LogOut, ImagePlus } from "lucide-react";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";

const STATUSES: UserStatus[] = ["online", "busy", "dnd", "idle", "invisible"];
const DURATIONS = ["15m", "1h", "8h", "24h", "3d", "forever"] as const;
const DURATION_MINUTES: Record<string, number | null> = {
  "15m": 15, "1h": 60, "8h": 480, "24h": 1440, "3d": 4320, forever: null
};

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [statusText, setStatusText] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [status, setStatus] = useState<UserStatus>("online");
  const [statusDuration, setStatusDuration] = useState<string>("forever");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const p = profile as any;

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setDisplayName(profile.display_name || "");
      setStatusText(profile.status_text || "");
      setAboutMe(p?.about_me || "");
      setStatus((profile as any).status as UserStatus || "online");
    }
  }, [profile]);

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

    const { error } = await supabase
      .from("profiles")
      .update({
        username: username.trim() || null,
        display_name: displayName.trim() || null,
        status_text: statusText.trim(),
        about_me: aboutMe.trim(),
        status,
        status_until: status === "online" ? null : statusUntil,
        language: i18n.language.split('-')[0],
        theme
      } as any)
      .eq("user_id", user.id);

    if (error) {
      const msg = error.message?.includes("profile_username_key") || error.message?.includes("unique constraint")
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
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user.id);
    await refreshProfile();
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
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ banner_url: urlData.publicUrl } as any).eq("user_id", user.id);
    await refreshProfile();
    setUploading(false);
  };

  const toggleLang = () => {
    const next = i18n.language === "ar" ? "en" : "ar";
    i18n.changeLanguage(next);
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = next;
  };

  const initials = (profile?.display_name || profile?.username || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6 overflow-y-auto h-full">
      <h2 className="text-xl font-bold">{t("profile.title")}</h2>

      {/* Banner */}
      <div className="relative rounded-lg overflow-hidden">
        {p?.banner_url ? (
          <img src={p.banner_url} alt="" className="h-36 w-full object-cover" />
        ) : (
          <div className="h-36 w-full bg-primary/20" />
        )}
        <label className="absolute top-2 end-2 h-8 w-8 rounded-full bg-background/80 flex items-center justify-center cursor-pointer hover:bg-background transition-colors">
          <ImagePlus className="h-4 w-4" />
          <input type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} disabled={uploading} />
        </label>
      </div>

      {/* Avatar */}
      <div className="flex items-center gap-4 -mt-12 ps-4">
        <div className="relative">
          <Avatar className="h-20 w-20 border-4 border-background">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/20 text-primary text-2xl">{initials}</AvatarFallback>
          </Avatar>
          <label className="absolute bottom-0 end-0 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors">
            <Camera className="h-3.5 w-3.5" />
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
          </label>
        </div>
        <div className="mt-8">
          <p className="font-medium">{profile?.display_name || "User"}</p>
          {profile?.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
        </div>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base">{t("nav.profile")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("profile.username")}</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
          </div>
          <div className="space-y-2">
            <Label>{t("profile.displayName")}</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("status.label")}</Label>
            <Select value={status} onValueChange={(v) => { setStatus(v as UserStatus); if (v === "online") setStatusDuration("forever"); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
            <div className="space-y-2">
              <Label>{t("status.duration")}</Label>
              <Select value={statusDuration} onValueChange={setStatusDuration}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {DURATIONS.map((d) => (
                    <SelectItem key={d} value={d}>{t(`duration.${d}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label>{t("profile.statusText")}</Label>
            <Input value={statusText} onChange={(e) => setStatusText(e.target.value)} placeholder={t("profile.statusText")} />
          </div>
          <div className="space-y-2">
            <Label>{t("profile.aboutMeLabel")}</Label>
            <Textarea
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value.slice(0, 500))}
              placeholder={t("profile.aboutMePlaceholder")}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-end">{aboutMe.length}/500</p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label>{t("profile.theme")}</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("profile.light")}</span>
              <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
              <span className="text-sm text-muted-foreground">{t("profile.dark")}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <Label>{t("profile.language")}</Label>
            <Button variant="outline" size="sm" onClick={toggleLang}>
              {i18n.language === "ar" ? "English" : "العربية"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {t("profile.save")}
        </Button>
        <Button variant="outline" onClick={signOut} className="w-full">
          <LogOut className="h-4 w-4 me-2" /> {t("auth.logout")}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
