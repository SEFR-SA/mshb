import React, { createContext, useContext, useEffect, useState, useMemo } from "react";
import { generateThemeFromColor } from "@/lib/themeGenerator";

type Theme = "dark" | "light" | "sado" | "majls";

export interface ColorThemePreset {
  id: string;
  name: string;
  colors: string[];                   // gradient stop hexes (used for buildGradient)
  primary?: string;                   // accent hex — applied to --primary/--ring/--sidebar-primary/--sidebar-ring
  vars?: Record<string, string>;      // full --color-* variable block
  solid?: boolean;                    // true = solid background, skip glassmorphism + use .solid-theme-active class
}

export const COLOR_THEME_PRESETS: ColorThemePreset[] = [
  { id: "default", name: "Default", colors: [] },

  // ─── DEEP / ELEGANT DARK THEMES ──────────────────────────────────────────

  {
    id: "pure-black", name: "Pure Black",
    colors: ["#000000"], primary: "#ffffff", solid: true,
    vars: {
      "--color-bg": "#000000",
      "--color-bg-muted": "#1a1a1a",
      "--color-surface": "#0d0d0d",
      "--color-border": "#262626",
      "--color-primary": "#ffffff",
      "--color-primary-dark": "#e6e6e6",
      "--color-text": "#ffffff",
      "--color-text-muted": "#999999",
      "--color-text-on-primary": "#000000",
      "--color-hover": "#f0f0f0",
      "--color-shadow": "rgba(0, 0, 0, 0.5)",
    },
  },

  {
    id: "ember", name: "Ember",
    colors: ["#161312"], primary: "#e65e2d", solid: true,
    vars: {
      "--color-bg": "#161312",
      "--color-bg-muted": "#221d1b",
      "--color-surface": "#1c1817",
      "--color-border": "#332c29",
      "--color-primary": "#e65e2d",
      "--color-primary-dark": "#c84718",
      "--color-text": "#f4f2f1",
      "--color-text-muted": "#afa29d",
      "--color-text-on-primary": "#ffffff",
      "--color-hover": "#e97044",
      "--color-shadow": "rgba(0, 0, 0, 0.3)",
    },
  },

  // ─── LIGHT / PASTEL THEMES ──────────────────────────────────────────────

  // ─── DEEP / ELEGANT DARK THEMES (continued) ─────────────────────────────

  {
    id: "jade", name: "Jade",
    colors: ["#121715"], primary: "#4be29b", solid: true,
    vars: {
      "--color-bg": "#121715",
      "--color-bg-muted": "#1b221f",
      "--color-surface": "#161d1a",
      "--color-border": "#28332e",
      "--color-primary": "#4be29b",
      "--color-primary-dark": "#23d683",
      "--color-text": "#f1f4f2",
      "--color-text-muted": "#9bb0a6",
      "--color-text-on-primary": "#ffffff",
      "--color-hover": "#61e5a7",
      "--color-shadow": "rgba(0, 0, 0, 0.3)",
    },
  },

  // ─── LIGHT / PASTEL THEMES (continued) ──────────────────────────────────

  {
    id: "cream", name: "Cream",
    colors: ["#f7f7f0"], primary: "#a86d3a", solid: true,
    vars: {
      "--color-bg": "#f7f7f0",
      "--color-bg-muted": "#e8e8df",
      "--color-surface": "#f0f0e8",
      "--color-border": "#d8d8d0",
      "--color-primary": "#a86d3a",
      "--color-primary-dark": "#8a5528",
      "--color-text": "#1a1a16",
      "--color-text-muted": "#5c5c54",
      "--color-text-on-primary": "#fafaf8",
      "--color-hover": "#c07d46",
      "--color-shadow": "rgba(0, 0, 0, 0.08)",
    },
  },

  {
    id: "lime", name: "Lime",
    colors: ["#fafbf9"], primary: "#8fc92d", solid: true,
    vars: {
      "--color-bg": "#fafbf9",
      "--color-bg-muted": "#f0f2ee",
      "--color-surface": "#ffffff",
      "--color-border": "#e2e5dc",
      "--color-primary": "#8fc92d",
      "--color-primary-dark": "#638a1f",
      "--color-text": "#363f27",
      "--color-text-muted": "#778263",
      "--color-text-on-primary": "#ffffff",
      "--color-hover": "#78a725",
      "--color-shadow": "rgba(0, 0, 0, 0.06)",
    },
  },

  {
    id: "violet", name: "Violet",
    colors: ["#161316"], primary: "#d62be6", solid: true,
    vars: {
      "--color-bg": "#161316",
      "--color-bg-muted": "#211c21",
      "--color-surface": "#1b171c",
      "--color-border": "#312a32",
      "--color-primary": "#d62be6",
      "--color-primary-dark": "#b817c7",
      "--color-text": "#f3f1f3",
      "--color-text-muted": "#ac9ead",
      "--color-text-on-primary": "#ffffff",
      "--color-hover": "#db42e9",
      "--color-shadow": "rgba(0, 0, 0, 0.3)",
    },
  },

  {
    id: "rose", name: "Rose",
    colors: ["#faf9fa"], primary: "#ea1e88", solid: true,
    vars: {
      "--color-bg": "#faf9fa",
      "--color-bg-muted": "#f1eef0",
      "--color-surface": "#ffffff",
      "--color-border": "#e4dde1",
      "--color-primary": "#ea1e88",
      "--color-primary-dark": "#ac1061",
      "--color-text": "#3e2833",
      "--color-text-muted": "#806573",
      "--color-text-on-primary": "#ffffff",
      "--color-hover": "#cd1373",
      "--color-shadow": "rgba(0, 0, 0, 0.06)",
    },
  },

  {
    id: "crimson", name: "Crimson",
    colors: ["#fafafa"], primary: "#c42d4e", solid: true,
    vars: {
      "--color-bg": "#fafafa",
      "--color-bg-muted": "#f1efef",
      "--color-surface": "#ffffff",
      "--color-border": "#e2dedf",
      "--color-primary": "#c42d4e",
      "--color-primary-dark": "#861f35",
      "--color-text": "#3b2b2e",
      "--color-text-muted": "#7a6b6e",
      "--color-text-on-primary": "#ffffff",
      "--color-hover": "#a32540",
      "--color-shadow": "rgba(0, 0, 0, 0.06)",
    },
  },

  {
    id: "arctic", name: "Arctic",
    colors: ["#111518"], primary: "#55a7dd", solid: true,
    vars: {
      "--color-bg": "#111518",
      "--color-bg-muted": "#192024",
      "--color-surface": "#151a1e",
      "--color-border": "#263036",
      "--color-primary": "#55a7dd",
      "--color-primary-dark": "#2a91d5",
      "--color-text": "#f0f3f5",
      "--color-text-muted": "#96a9b6",
      "--color-text-on-primary": "#ffffff",
      "--color-hover": "#6ab2e1",
      "--color-shadow": "rgba(0, 0, 0, 0.3)",
    },
  },

  {
    id: "cobalt", name: "Cobalt",
    colors: ["#f9fafb"], primary: "#237ac7", solid: true,
    vars: {
      "--color-bg": "#f9fafb",
      "--color-bg-muted": "#eef0f2",
      "--color-surface": "#ffffff",
      "--color-border": "#dde1e4",
      "--color-primary": "#237ac7",
      "--color-primary-dark": "#175286",
      "--color-text": "#28343e",
      "--color-text-muted": "#657480",
      "--color-text-on-primary": "#ffffff",
      "--color-hover": "#1c65a4",
      "--color-shadow": "rgba(0, 0, 0, 0.06)",
    },
  },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
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

/** Load a saved custom theme from localStorage, if any */
function loadCustomPreset(): ColorThemePreset | null {
  try {
    const raw = localStorage.getItem("app-custom-theme");
    if (!raw) return null;
    const { color, mode } = JSON.parse(raw);
    return generateThemeFromColor(color, mode) as ColorThemePreset;
  } catch { return null; }
}

function getColorsForTheme(themeId: string): string[] {
  if (themeId.startsWith("custom:")) {
    return themeId.replace("custom:", "").split(",");
  }
  if (themeId === "custom") {
    const cp = loadCustomPreset();
    return cp?.colors || [];
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

/** Extended vars that each theme preset sets — cleared when returning to Default */
const COLOR_THEME_EXTRA_VARS = [
  "--color-bg", "--color-bg-muted", "--color-surface", "--color-border",
  "--color-primary", "--color-primary-dark",
  "--color-text", "--color-text-muted", "--color-text-on-primary",
  "--color-hover", "--color-shadow",
  "--primary", "--ring", "--sidebar-primary", "--sidebar-ring",
  // Shadcn standard vars overridden per-theme (must be cleared on reset):
  "--background", "--muted", "--border", "--primary-foreground", "--surface", "--accent",
  // Sidebar vars — must be cleared on reset so base theme's sidebar color is restored:
  "--sidebar-background", "--sidebar-accent", "--sidebar-border",
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
  COLOR_THEME_EXTRA_VARS.forEach((v) => root.style.removeProperty(v));
  root.classList.remove("gradient-active", "gradient-light", "solid-theme-active");
}

/** Convert CSS HSL string ("h s% l%") to a hex color */
function cssHslToHex(hslStr: string): string {
  const parts = hslStr.trim().split(/\s+/);
  if (parts.length < 3) return "#000000";
  const h = parseFloat(parts[0]);
  const s = parseFloat(parts[1]) / 100;
  const l = parseFloat(parts[2]) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** True if a hex color is perceptually light */
function isLightHex(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.5;
}

/**
 * Send the current background colour to Electron's native title bar overlay.
 * If overrideHex is provided (gradient themes), use that directly.
 * No-op when not running inside Electron.
 */
function syncElectronTitleBar(overrideHex?: string): void {
  const electronAPI = (window as any).electronAPI;
  if (!electronAPI?.setTitleBarColor) return;
  if (overrideHex) {
    electronAPI.setTitleBarColor(
      overrideHex,
      isLightHex(overrideHex) ? "#000000" : "#ffffff"
    );
    return;
  }
  const root = document.documentElement;
  const bgHsl = getComputedStyle(root).getPropertyValue("--background").trim();
  if (!bgHsl) return;
  const bgHex = cssHslToHex(bgHsl);
  const bgLightness = parseFloat(bgHsl.split(/\s+/)[2] ?? "50");
  electronAPI.setTitleBarColor(bgHex, bgLightness < 50 ? "#ffffff" : "#000000");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("app-theme");
    if (stored === "light" || stored === "dark" || stored === "sado" || stored === "majls") return stored;
    return "dark";
  });

  const [colorTheme, setColorThemeState] = useState<string>(() => {
    return localStorage.getItem("app-color-theme") || "default";
  });

  // Version counter — incremented when a custom theme is saved to bust useMemo cache
  const [customVersion, setCustomVersion] = useState(0);

  const colors = useMemo(() => getColorsForTheme(colorTheme), [colorTheme, customVersion]);
  const isGradientActive = colors.length > 0;
  const isGradientLight = useMemo(() => {
    if (!isGradientActive) return false;
    return getAverageLuminance(colors) > 0.4;
  }, [colors, isGradientActive]);
  const isSolidTheme = useMemo(() => {
    const preset = colorTheme === "custom" ? loadCustomPreset() : COLOR_THEME_PRESETS.find(p => p.id === colorTheme);
    return isGradientActive && !!preset?.solid;
  }, [colorTheme, isGradientActive]);

  // Unified DOM effect — always clears all theme classes before applying one,
  // ensuring base themes and gradient themes are mutually exclusive on the DOM.
  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty("--theme-gradient", buildGradient(colors));
    localStorage.setItem("app-theme", theme);
    localStorage.setItem("app-color-theme", colorTheme);

    // Always clear ALL base theme classes first — prevents class conflicts
    // (e.g., .light class from a previous selection staying on the DOM when a gradient is applied)
    root.classList.remove("dark", "light", "sado", "majls");

    if (isGradientActive) {
      // All color themes are dark-based; add "dark" so Tailwind dark: variants work correctly
      root.classList.add("dark");
      if (isSolidTheme) {
        // Solid theme: opaque panels, no glassmorphism, no text-safety-shadow
        root.classList.add("solid-theme-active");
        root.classList.remove("gradient-active", "gradient-light");
      } else {
        // Gradient theme: frosted-glass panels, text-shadow contrast safety net
        root.classList.remove("solid-theme-active");
        applyGradientOverrides(colors, isGradientLight);
      }
      const preset = colorTheme === "custom" ? loadCustomPreset() : COLOR_THEME_PRESETS.find(p => p.id === colorTheme);
      if (preset?.vars) {
        const pv = preset.vars;
        Object.entries(pv).forEach(([k, v]) => root.style.setProperty(k, v));
        // Map --color-* → shadcn standard variables
        root.style.setProperty("--background", hexToHsl(colors[0]));
        if (pv["--color-text"]) {
          const fg = hexToHsl(pv["--color-text"]);
          root.style.setProperty("--foreground", fg);
          root.style.setProperty("--card-foreground", fg);
          root.style.setProperty("--popover-foreground", fg);
          root.style.setProperty("--sidebar-foreground", fg);
        }
        if (pv["--color-bg-muted"])   root.style.setProperty("--muted", hexToHsl(pv["--color-bg-muted"]));
        if (pv["--color-text-muted"]) root.style.setProperty("--muted-foreground", hexToHsl(pv["--color-text-muted"]));
        if (pv["--color-surface"]) {
          const surf = hexToHsl(pv["--color-surface"]);
          root.style.setProperty("--card", surf);
          root.style.setProperty("--popover", surf);
          root.style.setProperty("--surface", surf);
        }
        if (pv["--color-border"])          root.style.setProperty("--border", hexToHsl(pv["--color-border"]));
        if (pv["--color-text-on-primary"]) root.style.setProperty("--primary-foreground", hexToHsl(pv["--color-text-on-primary"]));
        // Sidebar panel vars — fixes settings modal sidebars staying in base theme color
        if (pv["--color-bg-muted"])  root.style.setProperty("--sidebar-background", hexToHsl(pv["--color-bg-muted"]));
        if (pv["--color-hover"]) {
          const hoverHsl = hexToHsl(pv["--color-hover"]);
          root.style.setProperty("--sidebar-accent", hoverHsl);
          root.style.setProperty("--accent", hoverHsl);
        }
        if (pv["--color-border"])    root.style.setProperty("--sidebar-border", hexToHsl(pv["--color-border"]));
      }
      if (preset?.primary) {
        const hsl = hexToHsl(preset.primary);
        root.style.setProperty("--primary", hsl);
        root.style.setProperty("--ring", hsl);
        root.style.setProperty("--sidebar-primary", hsl);
        root.style.setProperty("--sidebar-ring", hsl);
      }
      requestAnimationFrame(() => syncElectronTitleBar(colors[0]));
    } else {
      root.classList.add(theme);
      removeGradientOverrides();
      requestAnimationFrame(() => syncElectronTitleBar());
    }
  }, [theme, colorTheme, colors, isGradientActive, isGradientLight, isSolidTheme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    setColorThemeState("default"); // selecting a base theme clears any active gradient
  };
  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
    setColorThemeState("default"); // gradient is cleared when toggling base theme
  };
  const setColorTheme = (id: string) => {
    setColorThemeState(id);
    if (id === "custom") {
      // Bump version so useMemo re-evaluates even if colorTheme was already "custom"
      setCustomVersion(v => v + 1);
    }
    if (id !== "default") {
      setThemeState("dark");
    }
  };

  const getGradientStyle = (): React.CSSProperties => {
    if (colors.length === 0) return {};
    return { background: buildGradient(colors) };
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, colorTheme, setColorTheme, getGradientStyle, isGradientLight, isGradientActive }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
