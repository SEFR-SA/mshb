import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

type Theme = "dark" | "light" | "sado" | "majls";

export interface ColorThemePreset {
  id: string;
  name: string;
  colors: string[]; // hex colors for gradient
}

export const COLOR_THEME_PRESETS: ColorThemePreset[] = [
  { id: "default", name: "Default", colors: [] },
  { id: "midnight", name: "Midnight", colors: ["#1a1a2e", "#16213e", "#0f3460"] },
  { id: "sunset", name: "Sunset", colors: ["#ff6b35", "#f7c59f", "#efefd0"] },
  { id: "forest", name: "Forest", colors: ["#0b3d0b", "#1a5c2a", "#2d8a4e"] },
  { id: "aurora", name: "Aurora", colors: ["#1a0533", "#3a1078", "#4361ee"] },
  { id: "ember", name: "Ember", colors: ["#1a0000", "#4a0000", "#8b0000"] },
  { id: "ocean", name: "Ocean", colors: ["#0a1628", "#1a3a5c", "#2196f3"] },
  { id: "lavender", name: "Lavender", colors: ["#2d1b4e", "#4a2c6e", "#7b5ea7"] },
  { id: "rose", name: "Rose", colors: ["#4a1942", "#6b2d5b", "#c2185b"] },
  { id: "mint", name: "Mint", colors: ["#0d3b2e", "#1a6b5a", "#26a69a"] },
  { id: "candy", name: "Candy", colors: ["#ff6ec7", "#7873f5", "#4adede"] },
  { id: "dusk", name: "Dusk", colors: ["#2c1654", "#4a1942", "#d4145a"] },
  { id: "arctic", name: "Arctic", colors: ["#0d2137", "#1a4570", "#4fc3f7"] },
  { id: "bronze", name: "Bronze", colors: ["#1a1206", "#3d2c0a", "#8d6e2c"] },
  { id: "neon", name: "Neon", colors: ["#0a0a23", "#1b0a3c", "#6200ea"] },
  { id: "coral", name: "Coral", colors: ["#3e1929", "#6b2d3a", "#e57373"] },
  { id: "storm", name: "Storm", colors: ["#1a1a2e", "#2d2d44", "#4a4a6a"] },
  { id: "golden", name: "Golden", colors: ["#1a1400", "#3d3000", "#ffd700"] },
  { id: "teal_night", name: "Teal Night", colors: ["#0a2929", "#134e4e", "#009688"] },
  { id: "magma", name: "Magma", colors: ["#1a0a00", "#4a1a00", "#ff5722"] },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  accentColor: string;
  setAccentColor: (color: string) => void;
  colorTheme: string;
  setColorTheme: (id: string) => void;
  getGradientStyle: () => React.CSSProperties;
  isGradientLight: boolean;
  isGradientActive: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/** Convert hex (#rrggbb) to HSL string "h s% l%" */
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Calculate relative luminance of a hex color (0=black, 1=white) */
function hexToLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Average luminance across gradient colors */
function getAverageLuminance(colors: string[]): number {
  if (colors.length === 0) return 0;
  const total = colors.reduce((sum, c) => sum + hexToLuminance(c), 0);
  return total / colors.length;
}

const DEFAULT_ACCENT = "#084f00";

function applyAccentColor(hex: string) {
  const hsl = hexToHsl(hex);
  const root = document.documentElement;
  root.style.setProperty("--primary", hsl);
  root.style.setProperty("--ring", hsl);
  root.style.setProperty("--sidebar-primary", hsl);
  root.style.setProperty("--sidebar-ring", hsl);
}

function getColorsForTheme(themeId: string): string[] {
  if (themeId.startsWith("custom:")) {
    return themeId.replace("custom:", "").split(",");
  }
  const preset = COLOR_THEME_PRESETS.find((p) => p.id === themeId);
  return preset?.colors || [];
}

function buildGradient(colors: string[]): string {
  if (colors.length === 0) return "none";
  if (colors.length === 1) return colors[0];
  return `linear-gradient(135deg, ${colors.join(", ")})`;
}

/** CSS variable overrides to inject/remove when gradient is active */
const GRADIENT_OVERRIDE_VARS = [
  "--foreground", "--card-foreground", "--popover-foreground",
  "--muted-foreground", "--component-bg", "--component-border",
  "--popover", "--card", "--sidebar-foreground",
  "--sidebar-accent-foreground", "--secondary-foreground",
  "--accent-foreground",
];

function applyGradientOverrides(colors: string[], isLight: boolean) {
  const root = document.documentElement;

  // Foreground colors
  const fg = isLight ? "240 6% 3%" : "0 0% 100%";
  const mutedFg = isLight ? "215 10% 35%" : "215 10% 75%";

  root.style.setProperty("--foreground", fg);
  root.style.setProperty("--card-foreground", fg);
  root.style.setProperty("--popover-foreground", fg);
  root.style.setProperty("--sidebar-foreground", fg);
  root.style.setProperty("--sidebar-accent-foreground", fg);
  root.style.setProperty("--secondary-foreground", fg);
  root.style.setProperty("--accent-foreground", fg);
  root.style.setProperty("--muted-foreground", mutedFg);

  // Component surfaces
  root.style.setProperty("--component-bg", isLight ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)");
  root.style.setProperty("--component-border", isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)");

  // Derive popover/card from darkest or lightest gradient color
  const sorted = [...colors].sort((a, b) => hexToLuminance(a) - hexToLuminance(b));
  const surfaceColor = isLight ? sorted[sorted.length - 1] : sorted[0];
  const surfaceHsl = hexToHsl(surfaceColor);
  root.style.setProperty("--popover", surfaceHsl);
  root.style.setProperty("--card", surfaceHsl);

  // Toggle classes
  root.classList.add("gradient-active");
  if (isLight) {
    root.classList.add("gradient-light");
  } else {
    root.classList.remove("gradient-light");
  }
}

function removeGradientOverrides() {
  const root = document.documentElement;
  GRADIENT_OVERRIDE_VARS.forEach((v) => root.style.removeProperty(v));
  root.classList.remove("gradient-active", "gradient-light");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("app-theme");
    if (stored === "light" || stored === "dark" || stored === "sado" || stored === "majls") return stored;
    return "dark";
  });

  const [accentColor, setAccentColorState] = useState<string>(() => {
    return localStorage.getItem("app-accent-color") || DEFAULT_ACCENT;
  });

  const [colorTheme, setColorThemeState] = useState<string>(() => {
    return localStorage.getItem("app-color-theme") || "default";
  });

  const colors = useMemo(() => getColorsForTheme(colorTheme), [colorTheme]);
  const isGradientActive = colors.length > 0;
  const isGradientLight = useMemo(() => {
    if (!isGradientActive) return false;
    return getAverageLuminance(colors) > 0.4;
  }, [colors, isGradientActive]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light", "sado", "majls");
    root.classList.add(theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);

  useEffect(() => {
    applyAccentColor(accentColor);
    localStorage.setItem("app-accent-color", accentColor);
  }, [accentColor]);

  // Gradient + theme effect: inject/remove CSS variable overrides
  useEffect(() => {
    const gradient = buildGradient(colors);
    document.documentElement.style.setProperty("--theme-gradient", gradient);
    localStorage.setItem("app-color-theme", colorTheme);

    if (isGradientActive) {
      applyGradientOverrides(colors, isGradientLight);
    } else {
      removeGradientOverrides();
    }

    return () => {
      // Cleanup on unmount
    };
  }, [colorTheme, theme, colors, isGradientActive, isGradientLight]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () => setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  const setAccentColor = (color: string) => setAccentColorState(color);
  const setColorTheme = (id: string) => setColorThemeState(id);

  const getGradientStyle = (): React.CSSProperties => {
    if (colors.length === 0) return {};
    return { background: buildGradient(colors) };
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, accentColor, setAccentColor, colorTheme, setColorTheme, getGradientStyle, isGradientLight, isGradientActive }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
