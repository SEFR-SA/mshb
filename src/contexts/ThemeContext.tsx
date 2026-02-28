import React, { createContext, useContext, useEffect, useState, useMemo } from "react";

type Theme = "dark" | "light" | "sado" | "majls";

export interface ColorThemePreset {
  id: string;
  name: string;
  colors: string[];                   // gradient stop hexes (used for buildGradient)
  primary?: string;                   // accent hex — applied to --primary/--ring/--sidebar-primary/--sidebar-ring
  vars?: Record<string, string>;      // full --color-* variable block
}

export const COLOR_THEME_PRESETS: ColorThemePreset[] = [
  { id: "default", name: "Default", colors: [] },

  // ─── LIGHT / PASTEL THEMES (8) ──────────────────────────────────────────

  {
    id: "cotton_candy", name: "Cotton Candy",
    colors: ["#ffd6e7", "#e8d5f5", "#fff9e6"], primary: "#ff6b9d",
    vars: { "--color-bg": "linear-gradient(135deg, #ffd6e7, #e8d5f5, #fff9e6)", "--color-bg-muted": "#feeaf2", "--color-surface": "#ffffff", "--color-border": "#f0d5e0", "--color-primary": "#ff6b9d", "--color-primary-dark": "#c2185b", "--color-text": "#2d2340", "--color-text-muted": "#6b5b7b", "--color-text-on-primary": "#ffffff", "--color-hover": "#fce4f0", "--color-shadow": "rgba(255,107,157,0.2)" },
  },
  {
    id: "ocean_breeze", name: "Ocean Breeze",
    colors: ["#b8e8f8", "#c8f0e4", "#f0f8ff"], primary: "#0099b8",
    vars: { "--color-bg": "linear-gradient(135deg, #b8e8f8, #c8f0e4, #f0f8ff)", "--color-bg-muted": "#e4f5fc", "--color-surface": "#f8fbff", "--color-border": "#b8d8ec", "--color-primary": "#0099b8", "--color-primary-dark": "#006580", "--color-text": "#1a3040", "--color-text-muted": "#3a6080", "--color-text-on-primary": "#ffffff", "--color-hover": "#daf0f8", "--color-shadow": "rgba(0,153,184,0.2)" },
  },
  {
    id: "sunset_peach", name: "Sunset Peach",
    colors: ["#ffd0a8", "#ffe0b0", "#fff5e0"], primary: "#e87040",
    vars: { "--color-bg": "linear-gradient(135deg, #ffd0a8, #ffe0b0, #fff5e0)", "--color-bg-muted": "#ffecd4", "--color-surface": "#fffaf5", "--color-border": "#f0d0a8", "--color-primary": "#e87040", "--color-primary-dark": "#bf4010", "--color-text": "#3d2010", "--color-text-muted": "#7a4820", "--color-text-on-primary": "#ffffff", "--color-hover": "#fde8d0", "--color-shadow": "rgba(232,112,64,0.2)" },
  },
  {
    id: "lavender_dream", name: "Lavender Dream",
    colors: ["#dcc8f8", "#f8c8e0", "#fef0fa"], primary: "#9c27b0",
    vars: { "--color-bg": "linear-gradient(135deg, #dcc8f8, #f8c8e0, #fef0fa)", "--color-bg-muted": "#f5e8fd", "--color-surface": "#fdfaff", "--color-border": "#e0c8f0", "--color-primary": "#9c27b0", "--color-primary-dark": "#6a0f7e", "--color-text": "#2d1040", "--color-text-muted": "#6b4080", "--color-text-on-primary": "#ffffff", "--color-hover": "#f0dffe", "--color-shadow": "rgba(156,39,176,0.2)" },
  },
  {
    id: "spring_meadow", name: "Spring Meadow",
    colors: ["#b8f0c8", "#c8eef8", "#fffce8"], primary: "#2e9c5a",
    vars: { "--color-bg": "linear-gradient(135deg, #b8f0c8, #c8eef8, #fffce8)", "--color-bg-muted": "#e0f8ec", "--color-surface": "#f8fff9", "--color-border": "#b0e8c0", "--color-primary": "#2e9c5a", "--color-primary-dark": "#1b6840", "--color-text": "#1a3020", "--color-text-muted": "#3d6848", "--color-text-on-primary": "#ffffff", "--color-hover": "#d8f5e4", "--color-shadow": "rgba(46,156,90,0.2)" },
  },
  {
    id: "golden_hour", name: "Golden Hour",
    colors: ["#ffe082", "#ffd0a0", "#fff8e8"], primary: "#e68a10",
    vars: { "--color-bg": "linear-gradient(135deg, #ffe082, #ffd0a0, #fff8e8)", "--color-bg-muted": "#fff3c8", "--color-surface": "#fffdf5", "--color-border": "#f0d870", "--color-primary": "#e68a10", "--color-primary-dark": "#a05800", "--color-text": "#2d1f00", "--color-text-muted": "#6b4800", "--color-text-on-primary": "#ffffff", "--color-hover": "#fdedb8", "--color-shadow": "rgba(230,138,16,0.2)" },
  },
  {
    id: "cherry_blossom", name: "Cherry Blossom",
    colors: ["#ffc8d8", "#ffd0c8", "#fff8f5"], primary: "#e91e8c",
    vars: { "--color-bg": "linear-gradient(135deg, #ffc8d8, #ffd0c8, #fff8f5)", "--color-bg-muted": "#feeaf2", "--color-surface": "#ffffff", "--color-border": "#f0c0d4", "--color-primary": "#e91e8c", "--color-primary-dark": "#9c0060", "--color-text": "#2d0f1a", "--color-text-muted": "#7a3050", "--color-text-on-primary": "#ffffff", "--color-hover": "#fde0ea", "--color-shadow": "rgba(233,30,140,0.2)" },
  },
  {
    id: "arctic_mist", name: "Arctic Mist",
    colors: ["#c0d8f0", "#d8e8f8", "#eef6ff"], primary: "#0066aa",
    vars: { "--color-bg": "linear-gradient(135deg, #c0d8f0, #d8e8f8, #eef6ff)", "--color-bg-muted": "#dde8f5", "--color-surface": "#f5f9ff", "--color-border": "#b8d0e8", "--color-primary": "#0066aa", "--color-primary-dark": "#004480", "--color-text": "#1a2840", "--color-text-muted": "#3d5880", "--color-text-on-primary": "#ffffff", "--color-hover": "#d5e5f5", "--color-shadow": "rgba(0,102,170,0.2)" },
  },

  // ─── VIBRANT / SYNTHWAVE THEMES (8) ─────────────────────────────────────

  {
    id: "synthwave", name: "Synthwave",
    colors: ["#2b0f4c", "#8a2387", "#e94057"], primary: "#ff6b9d",
    vars: { "--color-bg": "linear-gradient(135deg, #2b0f4c, #8a2387, #e94057)", "--color-bg-muted": "#220a3a", "--color-surface": "#1f0838", "--color-border": "#5a1880", "--color-primary": "#ff6b9d", "--color-primary-dark": "#cc2070", "--color-text": "#ffe0f0", "--color-text-muted": "#c090d0", "--color-text-on-primary": "#1a0020", "--color-hover": "#38104e", "--color-shadow": "rgba(255,107,157,0.35)" },
  },
  {
    id: "cyber_city", name: "Cyber City",
    colors: ["#0a0e33", "#1a2590", "#00c8ff"], primary: "#00e5ff",
    vars: { "--color-bg": "linear-gradient(135deg, #0a0e33, #1a2590, #00c8ff)", "--color-bg-muted": "#0c1040", "--color-surface": "#0e1238", "--color-border": "#2030a0", "--color-primary": "#00e5ff", "--color-primary-dark": "#0080cc", "--color-text": "#e0f8ff", "--color-text-muted": "#70c0f0", "--color-text-on-primary": "#001a22", "--color-hover": "#14185a", "--color-shadow": "rgba(0,229,255,0.35)" },
  },
  {
    id: "acid_green", name: "Acid Green",
    colors: ["#0a2018", "#0d5a3a", "#39ff14"], primary: "#39ff14",
    vars: { "--color-bg": "linear-gradient(135deg, #0a2018, #0d5a3a, #39ff14)", "--color-bg-muted": "#0c2215", "--color-surface": "#0c1e14", "--color-border": "#1a5030", "--color-primary": "#39ff14", "--color-primary-dark": "#20c000", "--color-text": "#e0ffe8", "--color-text-muted": "#70d898", "--color-text-on-primary": "#001a08", "--color-hover": "#102818", "--color-shadow": "rgba(57,255,20,0.35)" },
  },
  {
    id: "magma", name: "Magma",
    colors: ["#3d0010", "#c62828", "#ff6f00"], primary: "#ff9800",
    vars: { "--color-bg": "linear-gradient(135deg, #3d0010, #c62828, #ff6f00)", "--color-bg-muted": "#35000e", "--color-surface": "#2e0010", "--color-border": "#8a1010", "--color-primary": "#ff9800", "--color-primary-dark": "#e65100", "--color-text": "#fff3e0", "--color-text-muted": "#ff8a65", "--color-text-on-primary": "#1a0800", "--color-hover": "#4a001a", "--color-shadow": "rgba(255,152,0,0.35)" },
  },
  {
    id: "galactic", name: "Galactic",
    colors: ["#08042a", "#3d0090", "#9c27b0"], primary: "#e040fb",
    vars: { "--color-bg": "linear-gradient(135deg, #08042a, #3d0090, #9c27b0)", "--color-bg-muted": "#0c0535", "--color-surface": "#0a0430", "--color-border": "#5a0090", "--color-primary": "#e040fb", "--color-primary-dark": "#aa00c8", "--color-text": "#f3e5f5", "--color-text-muted": "#ce93d8", "--color-text-on-primary": "#1a0020", "--color-hover": "#140650", "--color-shadow": "rgba(224,64,251,0.35)" },
  },
  {
    id: "tropical_storm", name: "Tropical Storm",
    colors: ["#003d5b", "#00838f", "#ff6b6b"], primary: "#ff6b6b",
    vars: { "--color-bg": "linear-gradient(135deg, #003d5b, #00838f, #ff6b6b)", "--color-bg-muted": "#003050", "--color-surface": "#002e48", "--color-border": "#006888", "--color-primary": "#ff6b6b", "--color-primary-dark": "#cc2020", "--color-text": "#fff9f8", "--color-text-muted": "#ffa8a8", "--color-text-on-primary": "#1a0000", "--color-hover": "#004868", "--color-shadow": "rgba(255,107,107,0.35)" },
  },
  {
    id: "miami_vice", name: "Miami Vice",
    colors: ["#001a2a", "#0080c0", "#ff0090"], primary: "#ff40b0",
    vars: { "--color-bg": "linear-gradient(135deg, #001a2a, #0080c0, #ff0090)", "--color-bg-muted": "#001520", "--color-surface": "#001220", "--color-border": "#004870", "--color-primary": "#ff40b0", "--color-primary-dark": "#cc0080", "--color-text": "#ffc8f0", "--color-text-muted": "#cc80d8", "--color-text-on-primary": "#1a001a", "--color-hover": "#002038", "--color-shadow": "rgba(255,64,176,0.35)" },
  },
  {
    id: "dragon_fire", name: "Dragon Fire",
    colors: ["#1a0d00", "#8b3500", "#ff2200"], primary: "#ff6600",
    vars: { "--color-bg": "linear-gradient(135deg, #1a0d00, #8b3500, #ff2200)", "--color-bg-muted": "#1c0e00", "--color-surface": "#180c00", "--color-border": "#6a2800", "--color-primary": "#ff6600", "--color-primary-dark": "#cc3300", "--color-text": "#fff0e0", "--color-text-muted": "#ff9966", "--color-text-on-primary": "#1a0400", "--color-hover": "#281400", "--color-shadow": "rgba(255,102,0,0.35)" },
  },

  // ─── DEEP / ELEGANT DARK THEMES (8) ─────────────────────────────────────

  {
    id: "midnight_navy", name: "Midnight Navy",
    colors: ["#0a0e2e", "#1c2680", "#2d1b69"], primary: "#7986cb",
    vars: { "--color-bg": "linear-gradient(135deg, #0a0e2e, #1c2680, #2d1b69)", "--color-bg-muted": "#0d1238", "--color-surface": "#0f1435", "--color-border": "#2a3080", "--color-primary": "#7986cb", "--color-primary-dark": "#4a58a8", "--color-text": "#e8eaf6", "--color-text-muted": "#9fa8da", "--color-text-on-primary": "#0a0e2e", "--color-hover": "#141a50", "--color-shadow": "rgba(121,134,203,0.3)" },
  },
  {
    id: "forest_royal", name: "Forest Royal",
    colors: ["#0a1a0a", "#1a3d1a", "#2d5a1f"], primary: "#81c784",
    vars: { "--color-bg": "linear-gradient(135deg, #0a1a0a, #1a3d1a, #2d5a1f)", "--color-bg-muted": "#0d2010", "--color-surface": "#0f2210", "--color-border": "#1a4020", "--color-primary": "#81c784", "--color-primary-dark": "#388e3c", "--color-text": "#e8f5e9", "--color-text-muted": "#a5d6a7", "--color-text-on-primary": "#0a1a0a", "--color-hover": "#142814", "--color-shadow": "rgba(129,199,132,0.3)" },
  },
  {
    id: "imperial_crimson", name: "Imperial Crimson",
    colors: ["#1c0008", "#5c0018", "#6b0a4a"], primary: "#f48fb1",
    vars: { "--color-bg": "linear-gradient(135deg, #1c0008, #5c0018, #6b0a4a)", "--color-bg-muted": "#200010", "--color-surface": "#1c000e", "--color-border": "#4a0030", "--color-primary": "#f48fb1", "--color-primary-dark": "#c2185b", "--color-text": "#fce4ec", "--color-text-muted": "#f48fb1", "--color-text-on-primary": "#1a0010", "--color-hover": "#2c0018", "--color-shadow": "rgba(244,143,177,0.3)" },
  },
  {
    id: "obsidian", name: "Obsidian",
    colors: ["#0e1218", "#18202e", "#1e2d40"], primary: "#4fc3f7",
    vars: { "--color-bg": "linear-gradient(135deg, #0e1218, #18202e, #1e2d40)", "--color-bg-muted": "#131a24", "--color-surface": "#141c2a", "--color-border": "#263040", "--color-primary": "#4fc3f7", "--color-primary-dark": "#0286c8", "--color-text": "#eceff1", "--color-text-muted": "#90a4ae", "--color-text-on-primary": "#0a1520", "--color-hover": "#1c2840", "--color-shadow": "rgba(79,195,247,0.3)" },
  },
  {
    id: "amethyst", name: "Amethyst",
    colors: ["#18003a", "#3d0088", "#5c2d91"], primary: "#ce93d8",
    vars: { "--color-bg": "linear-gradient(135deg, #18003a, #3d0088, #5c2d91)", "--color-bg-muted": "#1e0048", "--color-surface": "#1c0042", "--color-border": "#4a1080", "--color-primary": "#ce93d8", "--color-primary-dark": "#9c27b0", "--color-text": "#f3e5f5", "--color-text-muted": "#ce93d8", "--color-text-on-primary": "#1a0030", "--color-hover": "#280060", "--color-shadow": "rgba(206,147,216,0.3)" },
  },
  {
    id: "copper_age", name: "Copper Age",
    colors: ["#1a0800", "#4a1c00", "#6b3500"], primary: "#ffa04a",
    vars: { "--color-bg": "linear-gradient(135deg, #1a0800, #4a1c00, #6b3500)", "--color-bg-muted": "#200c00", "--color-surface": "#1e0e00", "--color-border": "#502000", "--color-primary": "#ffa04a", "--color-primary-dark": "#cc6600", "--color-text": "#fff0d8", "--color-text-muted": "#ffb870", "--color-text-on-primary": "#1a0800", "--color-hover": "#2a1000", "--color-shadow": "rgba(255,160,74,0.3)" },
  },
  {
    id: "deep_teal", name: "Deep Teal",
    colors: ["#001820", "#003040", "#00506a"], primary: "#4dd0e1",
    vars: { "--color-bg": "linear-gradient(135deg, #001820, #003040, #00506a)", "--color-bg-muted": "#001c28", "--color-surface": "#001e2a", "--color-border": "#004060", "--color-primary": "#4dd0e1", "--color-primary-dark": "#00838f", "--color-text": "#e0f7fa", "--color-text-muted": "#80deea", "--color-text-on-primary": "#001a20", "--color-hover": "#002838", "--color-shadow": "rgba(77,208,225,0.3)" },
  },
  {
    id: "phantom_noir", name: "Phantom Noir",
    colors: ["#07070f", "#0f0f1e", "#17152e"], primary: "#9575cd",
    vars: { "--color-bg": "linear-gradient(135deg, #07070f, #0f0f1e, #17152e)", "--color-bg-muted": "#0c0c1a", "--color-surface": "#0f0f20", "--color-border": "#252045", "--color-primary": "#9575cd", "--color-primary-dark": "#6200ea", "--color-text": "#f5f5ff", "--color-text-muted": "#9575cd", "--color-text-on-primary": "#0a0a18", "--color-hover": "#141228", "--color-shadow": "rgba(149,117,205,0.3)" },
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

/** Extended vars that each theme preset sets — cleared when returning to Default */
const COLOR_THEME_EXTRA_VARS = [
  "--color-bg", "--color-bg-muted", "--color-surface", "--color-border",
  "--color-primary", "--color-primary-dark",
  "--color-text", "--color-text-muted", "--color-text-on-primary",
  "--color-hover", "--color-shadow",
  "--primary", "--ring", "--sidebar-primary", "--sidebar-ring",
  // Shadcn standard vars overridden per-theme (must be cleared on reset):
  "--background", "--muted", "--border", "--primary-foreground",
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
  root.classList.remove("gradient-active", "gradient-light");
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

  const colors = useMemo(() => getColorsForTheme(colorTheme), [colorTheme]);
  const isGradientActive = colors.length > 0;
  const isGradientLight = useMemo(() => {
    if (!isGradientActive) return false;
    return getAverageLuminance(colors) > 0.4;
  }, [colors, isGradientActive]);

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
      // Gradient themes are all dark-based; add "dark" so Tailwind dark: variants work correctly
      root.classList.add("dark");
      applyGradientOverrides(colors, isGradientLight);
      const preset = COLOR_THEME_PRESETS.find(p => p.id === colorTheme);
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
        }
        if (pv["--color-border"])          root.style.setProperty("--border", hexToHsl(pv["--color-border"]));
        if (pv["--color-text-on-primary"]) root.style.setProperty("--primary-foreground", hexToHsl(pv["--color-text-on-primary"]));
        // Sidebar panel vars — fixes settings modal sidebars staying in base theme color
        if (pv["--color-bg-muted"])  root.style.setProperty("--sidebar-background", hexToHsl(pv["--color-bg-muted"]));
        if (pv["--color-hover"])     root.style.setProperty("--sidebar-accent", hexToHsl(pv["--color-hover"]));
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
  }, [theme, colorTheme, colors, isGradientActive, isGradientLight]);

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
    if (id !== "default") {
      setThemeState("dark"); // all gradient themes are dark-based; prevents .light/.sado/.majls conflict
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
