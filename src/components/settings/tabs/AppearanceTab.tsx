import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, COLOR_THEME_PRESETS } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { Palette, Lock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import ThemeBuilder from "@/components/settings/ThemeBuilder";

// Unified ThemePreviewCard Component
interface ThemePreviewCardProps {
  sidebarBg: string;
  mainBg: string;
  primary: string;
  textColor: string;
  mutedColor: string;
  isActive: boolean;
  isLocked: boolean;
  label: string;
  onClick: () => void;
}

/** Calculate perceived brightness from hex color (0-255) */
const hexToBrightness = (hex: string): number => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
};

const ThemePreviewCard = ({
  sidebarBg,
  mainBg,
  primary,
  textColor,
  mutedColor,
  isActive,
  isLocked,
  label,
  onClick,
}: ThemePreviewCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border-2 p-1 transition-all hover:scale-105 relative",
        isLocked ? "opacity-60 cursor-not-allowed" : "",
        isActive
          ? "border-primary ring-2 ring-primary/30"
          : "border-border"
      )}
      title={label}
    >
      {/* Mini App Window */}
      <div
        className="w-full h-14 rounded-md overflow-hidden border border-black/10 shadow-sm flex"
        style={{ background: mainBg }}
      >
        {/* Left Sidebar */}
        <div className="w-[30%] h-full" style={{ background: sidebarBg }} />

        {/* Right Chat Area */}
        <div className="flex-1 h-full p-1.5 flex flex-col gap-1">
          {/* Header skeleton */}
          <div className="h-1.5 w-full rounded-sm" style={{ background: mutedColor }} />
          {/* Message 1 */}
          <div className="h-1 w-2/3 rounded-sm" style={{ background: textColor }} />
          {/* Message 2 */}
          <div className="h-1 w-1/2 rounded-sm" style={{ background: textColor }} />
          {/* Primary Accent Button */}
          <div className="h-2 w-8 rounded-sm mt-auto self-end" style={{ background: primary }} />
        </div>
      </div>

      {isLocked && (
        <div className="absolute top-1.5 end-1.5 bg-background/80 rounded-full p-0.5">
          <Lock className="h-2.5 w-2.5 text-muted-foreground" />
        </div>
      )}

      <p className="text-xs text-center mt-1 text-muted-foreground font-medium">{label}</p>
    </button>
  );
};

// Light/Sado/Dark/Majls are meta-presets that map theme + colorTheme
const BASE_THEMES = [
  { id: "light", label: "themeLight", theme: "light" as const, colorTheme: "default", sidebarBg: "#f3f4f6", mainBg: "#ffffff", primary: "#3b82f6", textColor: "rgba(0,0,0,0.6)", mutedColor: "rgba(0,0,0,0.25)", pro: false },
  { id: "sado",  label: "themeSado",  theme: "sado"  as const, colorTheme: "default", sidebarBg: "#fef2f2", mainBg: "#ffffff", primary: "#c44a3d", textColor: "rgba(196,74,61,0.6)", mutedColor: "rgba(196,74,61,0.25)", pro: true },
  { id: "dark",  label: "themeDark",  theme: "dark"  as const, colorTheme: "default", sidebarBg: "#18181b", mainBg: "#09090b", primary: "#6366f1", textColor: "rgba(255,255,255,0.6)", mutedColor: "rgba(255,255,255,0.25)", pro: false },
  { id: "majls", label: "themeMajls", theme: "majls" as const, colorTheme: "default", sidebarBg: "#2d1810", mainBg: "#1f130c", primary: "#c44a3d", textColor: "rgba(196,74,61,0.6)", mutedColor: "rgba(196,74,61,0.25)", pro: true },
] as const;

const AppearanceTab = () => {
  const { t } = useTranslation();
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();
  const { profile } = useAuth();
  const isPro = (profile as any)?.is_pro ?? false;
  const [showBuilder, setShowBuilder] = useState(false);
  const isMobile = useIsMobile();

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
              <ThemePreviewCard
                key={bt.id}
                sidebarBg={bt.sidebarBg}
                mainBg={bt.mainBg}
                primary={bt.primary}
                textColor={bt.textColor}
                mutedColor={bt.mutedColor}
                isActive={bt.theme === theme && colorTheme === "default" && !locked}
                isLocked={locked}
                label={t(`settings.${bt.label}`)}
                onClick={() => {
                  if (locked) { showUpgradeToast(); return; }
                  setTheme(bt.theme);
                }}
              />
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {COLOR_THEME_PRESETS.map((preset) => {
            const locked = preset.id !== "default" && !isPro;
            // Compute colors for the mini app preview
            const mainBg = preset.colors.length > 0
              ? (preset.colors.length === 1 ? preset.colors[0] : `linear-gradient(135deg, ${preset.colors.join(", ")})`)
              : "hsl(var(--background))";
            const sidebarBg = preset.vars?.["--color-bg-muted"] || "hsl(var(--muted))";
            const primary = preset.primary ? preset.primary : "hsl(var(--primary))";
            // Calculate text/muted colors based on background luminance
            const isLight = preset.colors.length > 0 && preset.colors[0] && hexToBrightness(preset.colors[0]) > 128;
            const textColor = isLight ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.6)";
            const mutedColor = isLight ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.25)";

            return (
              <ThemePreviewCard
                key={preset.id}
                sidebarBg={sidebarBg}
                mainBg={mainBg}
                primary={primary}
                textColor={textColor}
                mutedColor={mutedColor}
                isActive={colorTheme === preset.id}
                isLocked={locked}
                label={preset.id === "default" ? t("profile.defaultTheme") : preset.name}
                onClick={() => {
                  if (locked) { showUpgradeToast(); return; }
                  setColorTheme(preset.id);
                }}
              />
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
