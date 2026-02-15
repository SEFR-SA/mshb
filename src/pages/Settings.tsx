import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, COLOR_THEME_PRESETS } from "@/contexts/ThemeContext";
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
import { Camera, LogOut, ImagePlus, Download, Palette, Type } from "lucide-react";
import { FONT_STYLES, convertToFont, revertToPlain, type FontStyle } from "@/lib/unicodeFonts";
import StyledDisplayName from "@/components/StyledDisplayName";
import { StatusBadge, type UserStatus } from "@/components/StatusBadge";
import { SettingsSkeleton } from "@/components/skeletons/SkeletonLoaders";

const STATUSES: UserStatus[] = ["online", "busy", "dnd", "idle", "invisible"];
const DURATIONS = ["15m", "1h", "8h", "24h", "3d", "forever"] as const;
const DURATION_MINUTES: Record<string, number | null> = {
  "15m": 15, "1h": 60, "8h": 480, "24h": 1440, "3d": 4320, forever: null
};

const Settings = () => {
  const { t, i18n } = useTranslation();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { theme, setTheme, accentColor, setAccentColor, colorTheme, setColorTheme } = useTheme();

  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [statusText, setStatusText] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [status, setStatus] = useState<UserStatus>("online");
  const [statusDuration, setStatusDuration] = useState<string>("forever");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [customColor1, setCustomColor1] = useState("#1a1a2e");
  const [customColor2, setCustomColor2] = useState("#0f3460");
  const [gradientStart, setGradientStart] = useState("");
  const [gradientEnd, setGradientEnd] = useState("");
  const [selectedFont, setSelectedFont] = useState<FontStyle>("Normal");

  const p = profile as any;

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    setInstallPrompt(null);
  };

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setDisplayName(profile.display_name || "");
      setStatusText(profile.status_text || "");
      setAboutMe(p?.about_me || "");
      setStatus((profile as any).status as UserStatus || "online");
      setGradientStart(p?.name_gradient_start || "");
      setGradientEnd(p?.name_gradient_end || "");
      if (p?.color_theme) {
        setColorTheme(p.color_theme);
        if (p.color_theme.startsWith("custom:")) {
          const parts = p.color_theme.replace("custom:", "").split(",");
          if (parts[0]) setCustomColor1(parts[0]);
          if (parts[1]) setCustomColor2(parts[1]);
        }
      }
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
        theme,
        color_theme: colorTheme,
        name_gradient_start: gradientStart || null,
        name_gradient_end: gradientEnd || null,
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

  if (!profile) return <SettingsSkeleton />;

  return (
    <div className="p-4 max-w-lg mx-auto space-y-6 overflow-y-auto h-full animate-fade-in">
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
          <StyledDisplayName
            displayName={profile?.display_name || "User"}
            gradientStart={p?.name_gradient_start}
            gradientEnd={p?.name_gradient_end}
            className="font-medium"
          />
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

      {/* Name Style */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="h-4 w-4" />
            {t("nameStyle.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Font Style Buttons */}
          <div className="space-y-2">
            <Label>{t("nameStyle.fontStyle")}</Label>
            <div className="flex flex-wrap gap-2">
              {FONT_STYLES.map((font) => (
                <button
                  key={font.id}
                  onClick={() => {
                    setSelectedFont(font.id);
                    const plain = revertToPlain(displayName);
                    setDisplayName(convertToFont(plain, font.id));
                  }}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                    selectedFont === font.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {font.preview}
                </button>
              ))}
            </div>
          </div>

          {/* Gradient Colors */}
          <div className="space-y-2">
            <Label>{t("nameStyle.gradientColors")}</Label>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("nameStyle.startColor")}</span>
                <label className="h-8 w-8 rounded-full border border-border cursor-pointer overflow-hidden relative">
                  <div className="h-full w-full" style={{ backgroundColor: gradientStart || "#ffffff" }} />
                  <input
                    type="color"
                    value={gradientStart || "#ffffff"}
                    onChange={(e) => setGradientStart(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("nameStyle.endColor")}</span>
                <label className="h-8 w-8 rounded-full border border-border cursor-pointer overflow-hidden relative">
                  <div className="h-full w-full" style={{ backgroundColor: gradientEnd || "#ffffff" }} />
                  <input
                    type="color"
                    value={gradientEnd || "#ffffff"}
                    onChange={(e) => setGradientEnd(e.target.value)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </div>
              {(gradientStart || gradientEnd) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => { setGradientStart(""); setGradientEnd(""); }}
                >
                  {t("nameStyle.clearGradient")}
                </Button>
              )}
            </div>
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <Label>{t("nameStyle.preview")}</Label>
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <StyledDisplayName
                displayName={displayName || "Your Name"}
                gradientStart={gradientStart || null}
                gradientEnd={gradientEnd || null}
                className="text-lg font-bold"
              />
            </div>
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
          <div className="space-y-2">
            <Label>{t("profile.accentColor")}</Label>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { hex: "#084f00", label: "Green" },
                { hex: "#2563eb", label: "Blue" },
                { hex: "#7c3aed", label: "Purple" },
                { hex: "#dc2626", label: "Red" },
                { hex: "#ea580c", label: "Orange" },
                { hex: "#0d9488", label: "Teal" },
              ].map((preset) => (
                <button
                  key={preset.hex}
                  onClick={() => setAccentColor(preset.hex)}
                  className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                    accentColor === preset.hex ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: preset.hex }}
                  title={preset.label}
                />
              ))}
              <label className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center cursor-pointer hover:border-foreground transition-colors overflow-hidden relative" title="Custom">
                <span className="text-xs text-muted-foreground">+</span>
                <input
                  type="color"
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
              {accentColor !== "#084f00" && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setAccentColor("#084f00")}>
                  {t("profile.resetColor")}
                </Button>
              )}
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

      {/* Color Themes */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            {t("profile.colorThemes")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {COLOR_THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setColorTheme(preset.id)}
                className={`h-14 w-full rounded-lg border-2 transition-all hover:scale-105 ${
                  colorTheme === preset.id ? "border-primary ring-2 ring-primary/30 scale-105" : "border-border"
                }`}
                style={
                  preset.colors.length > 0
                    ? { background: `linear-gradient(135deg, ${preset.colors.join(", ")})` }
                    : {}
                }
                title={preset.name}
              >
                {preset.id === "default" && (
                  <span className="text-xs text-muted-foreground">{t("profile.defaultTheme")}</span>
                )}
              </button>
            ))}
            {/* Custom theme swatch */}
            <button
              onClick={() => setColorTheme(`custom:${customColor1},${customColor2}`)}
              className={`h-14 w-full rounded-lg border-2 transition-all hover:scale-105 flex items-center justify-center ${
                colorTheme.startsWith("custom:") ? "border-primary ring-2 ring-primary/30 scale-105" : "border-dashed border-muted-foreground"
              }`}
              style={
                colorTheme.startsWith("custom:")
                  ? { background: `linear-gradient(135deg, ${customColor1}, ${customColor2})` }
                  : {}
              }
              title={t("profile.customTheme")}
            >
              {!colorTheme.startsWith("custom:") && (
                <Palette className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>
          {/* Custom color pickers */}
          {colorTheme.startsWith("custom:") && (
            <div className="flex items-center gap-3 mt-4">
              <div className="flex items-center gap-2">
                <label className="h-8 w-8 rounded-full border border-border cursor-pointer overflow-hidden relative">
                  <div className="h-full w-full" style={{ backgroundColor: customColor1 }} />
                  <input
                    type="color"
                    value={customColor1}
                    onChange={(e) => {
                      setCustomColor1(e.target.value);
                      setColorTheme(`custom:${e.target.value},${customColor2}`);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
                <label className="h-8 w-8 rounded-full border border-border cursor-pointer overflow-hidden relative">
                  <div className="h-full w-full" style={{ backgroundColor: customColor2 }} />
                  <input
                    type="color"
                    value={customColor2}
                    onChange={(e) => {
                      setCustomColor2(e.target.value);
                      setColorTheme(`custom:${customColor1},${e.target.value}`);
                    }}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {t("profile.save")}
        </Button>
        {installPrompt && (
          <Button variant="outline" onClick={handleInstall} className="w-full">
            <Download className="h-4 w-4 me-2" /> {t("app.install")}
          </Button>
        )}
        <Button variant="outline" onClick={signOut} className="w-full">
          <LogOut className="h-4 w-4 me-2" /> {t("auth.logout")}
        </Button>
      </div>
    </div>
  );
};

export default Settings;
