import React, { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X, Dices, Sun, Moon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateThemeFromColor, generateRandomTheme, type ThemeMode } from "@/lib/themeGenerator";
import { useTheme } from "@/contexts/ThemeContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";

interface ThemeBuilderProps {
  onClose: () => void;
}

const ThemeBuilder = ({ onClose }: ThemeBuilderProps) => {
  const { t } = useTranslation();
  const { setColorTheme } = useTheme();
  const isMobile = useIsMobile();

  const [color, setColor] = useState("#5b7ee5");
  const [mode, setMode] = useState<ThemeMode>("auto");

  const preset = useMemo(() => generateThemeFromColor(color, mode), [color, mode]);
  const vars = preset.vars!;

  const handleSurprise = useCallback(() => {
    const { hex } = generateRandomTheme(mode);
    setColor(hex);
  }, [mode]);

  const handleSave = () => {
    localStorage.setItem("app-custom-theme", JSON.stringify({ color, mode }));
    setColorTheme("custom");
    onClose();
  };

  // Shared controls
  const controls = (
    <>
      {/* Mini color swatch preview */}
      <div className="flex gap-2 items-center">
        <div className="h-10 flex-1 rounded-lg border border-border" style={{ background: vars["--color-bg"] }} />
        <div className="h-10 flex-1 rounded-lg" style={{ background: vars["--color-primary"] }} />
        <div className="h-10 flex-1 rounded-lg border border-border" style={{ background: vars["--color-surface"] }} />
        <div className="h-10 flex-1 rounded-lg border border-border" style={{ background: vars["--color-bg-muted"] }} />
      </div>

      {/* Color Picker */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("themeBuilder.pickColor")}
        </label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-12 h-12 rounded-lg border-2 border-border cursor-pointer bg-transparent"
          />
          <span className="text-sm font-mono text-foreground uppercase">{color}</span>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("themeBuilder.mode")}
        </label>
        <div className="flex gap-1">
          {(["auto", "light", "dark"] as ThemeMode[]).map((m) => (
            <Button
              key={m}
              variant={mode === m ? "default" : "outline"}
              size="sm"
              onClick={() => setMode(m)}
              className="flex-1 text-xs capitalize"
            >
              {m === "light" && <Sun className="h-3 w-3 me-1" />}
              {m === "dark" && <Moon className="h-3 w-3 me-1" />}
              {t(`themeBuilder.mode_${m}`)}
            </Button>
          ))}
        </div>
      </div>

      {/* Surprise Me */}
      <Button variant="outline" onClick={handleSurprise} className="w-full gap-2">
        <Dices className="h-4 w-4" />
        {t("themeBuilder.surpriseMe")}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open onOpenChange={(open) => !open && onClose()}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{t("themeBuilder.title")}</DrawerTitle>
            <p className="text-xs text-muted-foreground">{t("themeBuilder.subtitle")}</p>
          </DrawerHeader>
          <div className="flex flex-col gap-4">
            {controls}
          </div>
          <DrawerFooter>
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={onClose} className="flex-1">
                {t("themeBuilder.cancel")}
              </Button>
              <Button onClick={handleSave} className="flex-1 gap-2">
                <Save className="h-4 w-4" />
                {t("themeBuilder.save")}
              </Button>
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: existing full-screen overlay
  const previewStyle: React.CSSProperties = {};
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      (previewStyle as any)[k] = v;
    });
  }

  return (
    <div className="fixed inset-0 z-[200] flex bg-black/60 backdrop-blur-sm">
      {/* ─── Preview Mock ─── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex h-[420px]"
          style={{ ...previewStyle, background: vars["--color-bg"] }}
        >
          {/* Server Rail */}
          <div
            className="w-14 flex-shrink-0 flex flex-col items-center gap-2 py-3"
            style={{ background: vars["--color-bg-muted"] }}
          >
            {[0,1,2].map(i => (
              <div
                key={i}
                className="w-10 h-10 rounded-2xl"
                style={{ background: i === 0 ? vars["--color-primary"] : vars["--color-border"] }}
              />
            ))}
            <div className="flex-1" />
            <div className="w-10 h-10 rounded-full" style={{ background: vars["--color-border"] }} />
          </div>

          {/* Sidebar */}
          <div
            className="w-48 flex-shrink-0 flex flex-col border-e"
            style={{ background: vars["--color-surface"], borderColor: vars["--color-border"] }}
          >
            <div className="p-3 font-bold text-sm truncate" style={{ color: vars["--color-text"] }}>
              {t("themeBuilder.mockServer")}
            </div>
            <div className="flex-1 px-2 space-y-0.5">
              {["general", "updates", "off-topic"].map((ch, i) => (
                <div
                  key={ch}
                  className="px-2 py-1.5 rounded-md text-xs truncate"
                  style={{
                    color: i === 0 ? vars["--color-text-on-primary"] : vars["--color-text-muted"],
                    background: i === 0 ? vars["--color-primary"] : "transparent",
                  }}
                >
                  # {ch}
                </div>
              ))}
            </div>
            <div
              className="p-2 flex items-center gap-2 border-t"
              style={{ borderColor: vars["--color-border"], background: vars["--color-bg-muted"] }}
            >
              <div className="w-8 h-8 rounded-full" style={{ background: vars["--color-primary"] }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate" style={{ color: vars["--color-text"] }}>User</div>
                <div className="text-[10px] truncate" style={{ color: vars["--color-text-muted"] }}>Online</div>
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <div
              className="px-4 py-3 border-b text-sm font-semibold"
              style={{ borderColor: vars["--color-border"], color: vars["--color-text"] }}
            >
              # general
            </div>
            <div className="flex-1 p-4 space-y-4 overflow-hidden">
              {[
                { name: "Mshb Bot", msg: t("themeBuilder.mockMsg1"), time: "12:00 PM" },
                { name: "User", msg: t("themeBuilder.mockMsg2"), time: "12:01 PM" },
                { name: "Mshb Bot", msg: t("themeBuilder.mockMsg3"), time: "12:02 PM" },
              ].map((m, i) => (
                <div key={i} className="flex gap-2">
                  <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: i % 2 === 0 ? vars["--color-primary"] : vars["--color-border"] }} />
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-bold" style={{ color: i % 2 === 0 ? vars["--color-primary"] : vars["--color-text"] }}>{m.name}</span>
                      <span className="text-[10px]" style={{ color: vars["--color-text-muted"] }}>{m.time}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: vars["--color-text"] }}>{m.msg}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3">
              <div
                className="rounded-lg px-3 py-2 text-xs"
                style={{ background: vars["--color-bg-muted"], color: vars["--color-text-muted"], border: `1px solid ${vars["--color-border"]}` }}
              >
                {t("themeBuilder.mockInput")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Controls Panel ─── */}
      <div
        className="w-72 flex-shrink-0 flex flex-col p-5 gap-5 border-s"
        style={{ background: "hsl(var(--background))", borderColor: "hsl(var(--border))" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{t("themeBuilder.title")}</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">{t("themeBuilder.subtitle")}</p>

        {controls}

        <div className="flex-1" />

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {t("themeBuilder.cancel")}
          </Button>
          <Button onClick={handleSave} className="flex-1 gap-2">
            <Save className="h-4 w-4" />
            {t("themeBuilder.save")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ThemeBuilder;
