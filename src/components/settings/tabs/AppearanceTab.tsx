import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, COLOR_THEME_PRESETS } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Palette, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import ThemeBuilder from "@/components/settings/ThemeBuilder";

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
  const [showBuilder, setShowBuilder] = useState(false);

  const showUpgradeToast = () => toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast") });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.appearance")}</h2>
        <p className="text-sm text-muted-foreground">Customize the look and feel of the app.</p>
      </div>

      {/* ─── Custom Theme Banner ─── */}
      <div
        className={cn(
          "relative rounded-xl border border-border p-4 flex items-center justify-between gap-4 overflow-hidden",
          !isPro && "opacity-70"
        )}
        style={{ background: "linear-gradient(135deg, hsl(var(--primary) / 0.08), hsl(var(--primary) / 0.02))" }}
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("themeBuilder.bannerTitle")}
            {!isPro && (
              <span className="ms-1 text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                <Lock className="h-2.5 w-2.5" /> PRO
              </span>
            )}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("themeBuilder.bannerSubtitle")}</p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            if (!isPro) { showUpgradeToast(); return; }
            setShowBuilder(true);
          }}
          className="flex-shrink-0"
        >
          {t("themeBuilder.createTheme")}
        </Button>
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
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
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
                  "group rounded-xl border-2 transition-all hover:scale-105 relative overflow-hidden",
                  locked ? "opacity-50 cursor-not-allowed" : "",
                  colorTheme === preset.id ? "ring-2 ring-offset-2 ring-offset-background" : "border-border"
                )}
                style={colorTheme === preset.id ? {
                  // @ts-expect-error CSS custom property
                  "--tw-ring-color": preset.primary || "hsl(var(--primary))",
                  borderColor: preset.primary || "hsl(var(--primary))",
                } : {}}
                title={preset.name}
              >
                {/* Top Half: Background Preview + Primary Accent */}
                <div
                  className="h-16 w-full relative flex items-center justify-center"
                  style={preset.colors.length > 0 ? {
                    background: preset.colors.length === 1
                      ? preset.colors[0]
                      : `linear-gradient(135deg, ${preset.colors.join(", ")})`
                  } : {}}
                >
                  {/* Primary Accent Circle */}
                  {(preset.primary || preset.id === "default") && (
                    <div
                      className="w-8 h-8 rounded-full shadow-sm border-2 border-white/20"
                      style={{
                        backgroundColor: preset.primary || "hsl(var(--primary))"
                      }}
                    />
                  )}

                  {/* Lock icon overlay */}
                  {locked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Lock className="h-4 w-4 text-white drop-shadow-lg" />
                    </div>
                  )}
                </div>

                {/* Bottom Half: Label */}
                <div className="bg-muted/50 py-1.5">
                  <p className="text-[10px] font-semibold text-center truncate px-1">
                    {preset.id === "default" ? t("profile.defaultTheme") : preset.name}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Theme Builder Overlay */}
      {showBuilder && <ThemeBuilder onClose={() => setShowBuilder(false)} />}
    </div>
  );
};

export default AppearanceTab;
