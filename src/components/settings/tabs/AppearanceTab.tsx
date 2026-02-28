import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, COLOR_THEME_PRESETS } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Label } from "@/components/ui/label";
import { Palette, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Density = "compact" | "default" | "spacious";

interface AppearancePrefs {
  messageSpacing: number;
  fontSize: number;
  density: Density;
}

const DEFAULT_PREFS: AppearancePrefs = { messageSpacing: 2, fontSize: 14, density: "default" };

// Light/Sado/Dark/Majls are meta-presets that map theme + colorTheme
const BASE_THEMES = [
  { id: "light", label: "themeLight", theme: "light" as const, colorTheme: "default", bg: "#f8f8f8", fg: "#1a1a1a", pro: false },
  { id: "sado",  label: "themeSado",  theme: "sado"  as const, colorTheme: "default", bg: "#fffdfa", fg: "#c44a3d", pro: true },
  { id: "dark",  label: "themeDark",  theme: "dark"  as const, colorTheme: "default", bg: "#1e1e2e", fg: "#e0e0e0", pro: false },
  { id: "majls", label: "themeMajls", theme: "majls" as const, colorTheme: "default", bg: "#1f130c", fg: "#c44a3d", pro: true },
] as const;

const AppearanceTab = () => {
  const { t } = useTranslation();
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();
  const { profile } = useAuth();
  const isPro = (profile as any)?.is_pro ?? false;

  const [prefs, setPrefs] = useState<AppearancePrefs>(DEFAULT_PREFS);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mshb_appearance_prefs");
      if (stored) {
        const p = { ...DEFAULT_PREFS, ...JSON.parse(stored) };
        setPrefs(p);
        document.documentElement.style.setProperty("--message-gap", `${p.messageSpacing * 4}px`);
        document.documentElement.style.setProperty("--chat-font-size", `${p.fontSize}px`);
      }
    } catch {}
  }, []);

  const updatePrefs = (patch: Partial<AppearancePrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    localStorage.setItem("mshb_appearance_prefs", JSON.stringify(next));
    if (patch.messageSpacing !== undefined) {
      document.documentElement.style.setProperty("--message-gap", `${patch.messageSpacing * 4}px`);
    }
    if (patch.fontSize !== undefined) {
      document.documentElement.style.setProperty("--chat-font-size", `${patch.fontSize}px`);
    }
  };

  const showUpgradeToast = () => toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast") });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.appearance")}</h2>
        <p className="text-sm text-muted-foreground">Customize the look and feel of the app.</p>
      </div>

      {/* Default Themes */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("settings.themes")}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BASE_THEMES.map((bt) => {
            const locked = bt.pro && !isPro;
            return (
              <button
                key={bt.id}
                onClick={() => {
                  if (locked) { showUpgradeToast(); return; }
                  setTheme(bt.theme);
                }}
                className={cn(
                  "rounded-xl border-2 p-1 transition-all hover:scale-105 relative",
                  locked ? "opacity-60 cursor-not-allowed" : "",
                  bt.theme === theme && colorTheme === "default" && !locked
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border"
                )}
                title={t(`settings.${bt.label}`)}
              >
                <div className="rounded-lg h-14 flex flex-col overflow-hidden" style={{ background: bt.bg }}>
                  <div className="h-3 flex gap-0.5 p-0.5">
                    {[0,1,2].map(i => <div key={i} className="flex-1 rounded-full opacity-30" style={{ background: bt.fg }} />)}
                  </div>
                  <div className="flex-1 p-1 flex flex-col gap-0.5">
                    {[0,1].map(i => <div key={i} className="h-1.5 rounded-full w-3/4 opacity-20" style={{ background: bt.fg }} />)}
                  </div>
                </div>
                {locked && (
                  <div className="absolute top-1.5 end-1.5 bg-background/80 rounded-full p-0.5">
                    <Lock className="h-2.5 w-2.5 text-muted-foreground" />
                  </div>
                )}
                <p className="text-xs text-center mt-1 text-muted-foreground font-medium">{t(`settings.${bt.label}`)}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Color Themes */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" /> {t("profile.colorThemes")}
          {!isPro && (
            <span className="ms-1 text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Lock className="h-2.5 w-2.5" /> PRO
            </span>
          )}
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {COLOR_THEME_PRESETS.map((preset) => {
            const locked = preset.id !== "default" && !isPro;
            return (
              <button
                key={preset.id}
                onClick={() => {
                  if (locked) { showUpgradeToast(); return; }
                  setColorTheme(preset.id);
                }}
                className={cn(
                  "rounded-lg border-2 transition-all hover:scale-105 relative overflow-hidden",
                  locked ? "opacity-50 cursor-not-allowed" : "",
                  colorTheme === preset.id ? "border-primary ring-2 ring-primary/30 scale-105" : "border-border"
                )}
                title={preset.name}
              >
                <div
                  className="h-10 w-full"
                  style={preset.colors.length > 0 ? { background: `linear-gradient(135deg, ${preset.colors.join(", ")})` } : {}}
                >
                  {preset.id === "default" && (
                    <span className="flex items-center justify-center h-full text-[10px] text-muted-foreground font-medium">
                      {t("profile.defaultTheme")}
                    </span>
                  )}
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="h-3 w-3 text-white drop-shadow-md" />
                    </div>
                  )}
                </div>
                <p className="text-[9px] text-center py-0.5 text-muted-foreground font-medium truncate px-0.5">
                  {preset.name}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* UI Customization */}
      <div className="space-y-5 border-t border-border/50 pt-6">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("settings.uiCustomization")}</h3>

        {/* Message Spacing */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("settings.messageSpacing")}</Label>
            <span className="text-xs text-muted-foreground">{prefs.messageSpacing}</span>
          </div>
          <input
            type="range" min={0} max={4} step={1}
            value={prefs.messageSpacing}
            onChange={(e) => updatePrefs({ messageSpacing: Number(e.target.value) })}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>None</span><span>Comfortable</span>
          </div>
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">{t("settings.chatFontSize")}</Label>
            <span className="text-xs text-muted-foreground">{prefs.fontSize}px</span>
          </div>
          <input
            type="range" min={12} max={18} step={1}
            value={prefs.fontSize}
            onChange={(e) => updatePrefs({ fontSize: Number(e.target.value) })}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>12px</span><span>18px</span>
          </div>
        </div>

        {/* Density */}
        <div className="space-y-2">
          <Label className="text-sm">{t("settings.uiDensity")}</Label>
          <div className="grid grid-cols-3 gap-2">
            {(["compact", "default", "spacious"] as Density[]).map((d) => (
              <button
                key={d}
                onClick={() => updatePrefs({ density: d })}
                className={cn(
                  "py-2 rounded-lg border-2 text-sm font-medium transition-colors",
                  prefs.density === d ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {t(`settings.density${d.charAt(0).toUpperCase() + d.slice(1)}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppearanceTab;
