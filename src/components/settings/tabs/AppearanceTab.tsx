import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme, COLOR_THEME_PRESETS } from "@/contexts/ThemeContext";
import { Label } from "@/components/ui/label";
import { Palette } from "lucide-react";
import { cn } from "@/lib/utils";

type Density = "compact" | "default" | "spacious";

interface AppearancePrefs {
  messageSpacing: number;
  fontSize: number;
  density: Density;
}

const DEFAULT_PREFS: AppearancePrefs = { messageSpacing: 2, fontSize: 14, density: "default" };

const ACCENT_PRESETS = [
  { hex: "#084f00", label: "Green" },
  { hex: "#2563eb", label: "Blue" },
  { hex: "#7c3aed", label: "Purple" },
  { hex: "#dc2626", label: "Red" },
  { hex: "#ea580c", label: "Orange" },
  { hex: "#0d9488", label: "Teal" },
];

// Light/Ash/Dark/Onyx are meta-presets that map theme + colorTheme
const BASE_THEMES = [
  { id: "light",  label: "themeLight",  theme: "light" as const, colorTheme: "default", bg: "#f8f8f8",  fg: "#1a1a1a" },
  { id: "ash",    label: "themeAsh",    theme: "light" as const, colorTheme: "default", bg: "#e8e4e0",  fg: "#2a2016" },
  { id: "dark",   label: "themeDark",   theme: "dark"  as const, colorTheme: "default", bg: "#1e1e2e",  fg: "#e0e0e0" },
  { id: "onyx",   label: "themeOnyx",   theme: "dark"  as const, colorTheme: "default", bg: "#0a0a0a",  fg: "#c0c0c0" },
] as const;

const AppearanceTab = () => {
  const { t } = useTranslation();
  const { theme, setTheme, accentColor, setAccentColor, colorTheme, setColorTheme } = useTheme();
  const [customColor1, setCustomColor1] = useState("#1a1a2e");
  const [customColor2, setCustomColor2] = useState("#0f3460");
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
      if (colorTheme.startsWith("custom:")) {
        const parts = colorTheme.replace("custom:", "").split(",");
        if (parts[0]) setCustomColor1(parts[0]);
        if (parts[1]) setCustomColor2(parts[1]);
      }
    } catch {}
  }, [colorTheme]);

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

  // Determine current base theme selection
  const activeBaseTheme = BASE_THEMES.find((bt) => bt.theme === theme) || BASE_THEMES[2];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.appearance")}</h2>
        <p className="text-sm text-muted-foreground">Customize the look and feel of the app.</p>
      </div>

      {/* Default Themes */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("settings.themes")}</h3>
        <div className="grid grid-cols-4 gap-3">
          {BASE_THEMES.map((bt) => (
            <button
              key={bt.id}
              onClick={() => setTheme(bt.theme)}
              className={cn(
                "rounded-xl border-2 p-1 transition-all hover:scale-105",
                theme === bt.theme && bt.id === (theme === "light" ? "light" : "dark")
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
              <p className="text-xs text-center mt-1 text-muted-foreground font-medium">{t(`settings.${bt.label}`)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Color */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("profile.accentColor")}</h3>
        <div className="flex items-center gap-2 flex-wrap">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.hex}
              onClick={() => setAccentColor(preset.hex)}
              className={cn(
                "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                accentColor === preset.hex ? "border-foreground scale-110" : "border-transparent"
              )}
              style={{ backgroundColor: preset.hex }}
              title={preset.label}
            />
          ))}
          <label className="h-8 w-8 rounded-full border-2 border-dashed border-muted-foreground flex items-center justify-center cursor-pointer hover:border-foreground transition-colors overflow-hidden relative" title="Custom">
            <span className="text-xs text-muted-foreground">+</span>
            <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer" />
          </label>
        </div>
      </div>

      {/* Color Themes */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Palette className="h-3.5 w-3.5" /> {t("profile.colorThemes")}
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
          {COLOR_THEME_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => setColorTheme(preset.id)}
              className={cn(
                "h-12 w-full rounded-lg border-2 transition-all hover:scale-105",
                colorTheme === preset.id ? "border-primary ring-2 ring-primary/30 scale-105" : "border-border"
              )}
              style={preset.colors.length > 0 ? { background: `linear-gradient(135deg, ${preset.colors.join(", ")})` } : {}}
              title={preset.name}
            >
              {preset.id === "default" && <span className="text-xs text-muted-foreground">{t("profile.defaultTheme")}</span>}
            </button>
          ))}
          {/* Custom swatch */}
          <button
            onClick={() => setColorTheme(`custom:${customColor1},${customColor2}`)}
            className={cn(
              "h-12 w-full rounded-lg border-2 transition-all hover:scale-105 flex items-center justify-center",
              colorTheme.startsWith("custom:") ? "border-primary ring-2 ring-primary/30 scale-105" : "border-dashed border-muted-foreground"
            )}
            style={colorTheme.startsWith("custom:") ? { background: `linear-gradient(135deg, ${customColor1}, ${customColor2})` } : {}}
            title={t("profile.customTheme")}
          >
            {!colorTheme.startsWith("custom:") && <Palette className="h-4 w-4 text-muted-foreground" />}
          </button>
        </div>
        {colorTheme.startsWith("custom:") && (
          <div className="flex items-center gap-3 mt-2">
            <label className="h-8 w-8 rounded-full border border-border cursor-pointer overflow-hidden relative">
              <div className="h-full w-full" style={{ backgroundColor: customColor1 }} />
              <input type="color" value={customColor1} onChange={(e) => { setCustomColor1(e.target.value); setColorTheme(`custom:${e.target.value},${customColor2}`); }} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
            <label className="h-8 w-8 rounded-full border border-border cursor-pointer overflow-hidden relative">
              <div className="h-full w-full" style={{ backgroundColor: customColor2 }} />
              <input type="color" value={customColor2} onChange={(e) => { setCustomColor2(e.target.value); setColorTheme(`custom:${customColor1},${e.target.value}`); }} className="absolute inset-0 opacity-0 cursor-pointer" />
            </label>
          </div>
        )}
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
