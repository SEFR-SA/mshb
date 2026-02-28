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

  {
    id: "midnight_nebula", name: "Midnight Nebula",
    colors: ["#0d0221", "#1a0533", "#3a1078"], primary: "#7c3aed",
    vars: { "--color-bg": "linear-gradient(135deg, #0d0221, #1a0533, #3a1078)", "--color-bg-muted": "#120329", "--color-surface": "#1a0533", "--color-border": "#2d1060", "--color-primary": "#7c3aed", "--color-primary-dark": "#5b21b6", "--color-text": "#f0e8ff", "--color-text-muted": "#9d8cc4", "--color-text-on-primary": "#ffffff", "--color-hover": "#2a0f5e", "--color-shadow": "rgba(124,58,237,0.3)" },
  },
  {
    id: "sunset_crimson", name: "Sunset Crimson",
    colors: ["#1a0500", "#5a0a00", "#c23000"], primary: "#ff5722",
    vars: { "--color-bg": "linear-gradient(135deg, #1a0500, #5a0a00, #c23000)", "--color-bg-muted": "#220800", "--color-surface": "#3d0a00", "--color-border": "#5a1500", "--color-primary": "#ff5722", "--color-primary-dark": "#bf360c", "--color-text": "#fff3e0", "--color-text-muted": "#ffab91", "--color-text-on-primary": "#ffffff", "--color-hover": "#4a1200", "--color-shadow": "rgba(255,87,34,0.3)" },
  },
  {
    id: "cyber_neon", name: "Cyber Neon",
    colors: ["#050510", "#0a0525", "#100540"], primary: "#00e5ff",
    vars: { "--color-bg": "linear-gradient(135deg, #050510, #0a0525, #100540)", "--color-bg-muted": "#08081a", "--color-surface": "#0d0d30", "--color-border": "#1a1a50", "--color-primary": "#00e5ff", "--color-primary-dark": "#00b2cc", "--color-text": "#e0f7ff", "--color-text-muted": "#80deea", "--color-text-on-primary": "#001a1f", "--color-hover": "#15154a", "--color-shadow": "rgba(0,229,255,0.25)" },
  },
  {
    id: "deep_ocean", name: "Deep Ocean",
    colors: ["#001528", "#002a4a", "#004070"], primary: "#2196f3",
    vars: { "--color-bg": "linear-gradient(135deg, #001528, #002a4a, #004070)", "--color-bg-muted": "#001e38", "--color-surface": "#002540", "--color-border": "#003560", "--color-primary": "#2196f3", "--color-primary-dark": "#0d47a1", "--color-text": "#e3f2fd", "--color-text-muted": "#90caf9", "--color-text-on-primary": "#ffffff", "--color-hover": "#003058", "--color-shadow": "rgba(33,150,243,0.25)" },
  },
  {
    id: "matcha_forest", name: "Matcha Forest",
    colors: ["#041208", "#0a2410", "#143a1e"], primary: "#66bb6a",
    vars: { "--color-bg": "linear-gradient(135deg, #041208, #0a2410, #143a1e)", "--color-bg-muted": "#071a0c", "--color-surface": "#0d2e14", "--color-border": "#1a4525", "--color-primary": "#66bb6a", "--color-primary-dark": "#388e3c", "--color-text": "#e8f5e9", "--color-text-muted": "#a5d6a7", "--color-text-on-primary": "#1a2e1a", "--color-hover": "#122818", "--color-shadow": "rgba(102,187,106,0.25)" },
  },
  {
    id: "sakura_night", name: "Sakura Night",
    colors: ["#1a0010", "#3d0025", "#6b0040"], primary: "#f06292",
    vars: { "--color-bg": "linear-gradient(135deg, #1a0010, #3d0025, #6b0040)", "--color-bg-muted": "#250018", "--color-surface": "#38002a", "--color-border": "#550038", "--color-primary": "#f06292", "--color-primary-dark": "#c2185b", "--color-text": "#fce4ec", "--color-text-muted": "#f48fb1", "--color-text-on-primary": "#ffffff", "--color-hover": "#4a0035", "--color-shadow": "rgba(240,98,146,0.3)" },
  },
  {
    id: "aurora_borealis", name: "Aurora Borealis",
    colors: ["#001020", "#003030", "#005545"], primary: "#1de9b6",
    vars: { "--color-bg": "linear-gradient(135deg, #001020, #003030, #005545)", "--color-bg-muted": "#001828", "--color-surface": "#002535", "--color-border": "#004040", "--color-primary": "#1de9b6", "--color-primary-dark": "#00bfa5", "--color-text": "#e0f2f1", "--color-text-muted": "#80cbc4", "--color-text-on-primary": "#001a15", "--color-hover": "#003038", "--color-shadow": "rgba(29,233,182,0.25)" },
  },
  {
    id: "volcanic_ash", name: "Volcanic Ash",
    colors: ["#0d0d0d", "#1a1a1e", "#252530"], primary: "#ff6b35",
    vars: { "--color-bg": "linear-gradient(135deg, #0d0d0d, #1a1a1e, #252530)", "--color-bg-muted": "#121215", "--color-surface": "#1e1e25", "--color-border": "#303040", "--color-primary": "#ff6b35", "--color-primary-dark": "#bf360c", "--color-text": "#f5f5f5", "--color-text-muted": "#9e9e9e", "--color-text-on-primary": "#ffffff", "--color-hover": "#25252e", "--color-shadow": "rgba(255,107,53,0.25)" },
  },
  {
    id: "golden_dusk", name: "Golden Dusk",
    colors: ["#1a1000", "#3d2800", "#6b4800"], primary: "#ffd740",
    vars: { "--color-bg": "linear-gradient(135deg, #1a1000, #3d2800, #6b4800)", "--color-bg-muted": "#221500", "--color-surface": "#2e2000", "--color-border": "#4a3200", "--color-primary": "#ffd740", "--color-primary-dark": "#ffa000", "--color-text": "#fff8e1", "--color-text-muted": "#ffe082", "--color-text-on-primary": "#1a1200", "--color-hover": "#3a2800", "--color-shadow": "rgba(255,215,64,0.25)" },
  },
  {
    id: "royal_velvet", name: "Royal Velvet",
    colors: ["#120018", "#2a003d", "#420063"], primary: "#ce93d8",
    vars: { "--color-bg": "linear-gradient(135deg, #120018, #2a003d, #420063)", "--color-bg-muted": "#180020", "--color-surface": "#260035", "--color-border": "#3a0055", "--color-primary": "#ce93d8", "--color-primary-dark": "#ab47bc", "--color-text": "#f3e5f5", "--color-text-muted": "#ba68c8", "--color-text-on-primary": "#12001a", "--color-hover": "#32004a", "--color-shadow": "rgba(206,147,216,0.3)" },
  },
  {
    id: "acid_lime", name: "Acid Lime",
    colors: ["#020802", "#051505", "#0a250a"], primary: "#b5ff4d",
    vars: { "--color-bg": "linear-gradient(135deg, #020802, #051505, #0a250a)", "--color-bg-muted": "#041004", "--color-surface": "#081808", "--color-border": "#102210", "--color-primary": "#b5ff4d", "--color-primary-dark": "#76e62a", "--color-text": "#f1f8e9", "--color-text-muted": "#aed581", "--color-text-on-primary": "#0a1f00", "--color-hover": "#0c200c", "--color-shadow": "rgba(181,255,77,0.25)" },
  },
  {
    id: "coral_abyss", name: "Coral Abyss",
    colors: ["#1a0805", "#3d1208", "#5a1a08"], primary: "#ff7043",
    vars: { "--color-bg": "linear-gradient(135deg, #1a0805, #3d1208, #5a1a08)", "--color-bg-muted": "#220a05", "--color-surface": "#2e0e08", "--color-border": "#441508", "--color-primary": "#ff7043", "--color-primary-dark": "#bf360c", "--color-text": "#fbe9e7", "--color-text-muted": "#ffab91", "--color-text-on-primary": "#ffffff", "--color-hover": "#3a1208", "--color-shadow": "rgba(255,112,67,0.3)" },
  },
  {
    id: "arctic_frost", name: "Arctic Frost",
    colors: ["#051520", "#0a2535", "#103548"], primary: "#80deea",
    vars: { "--color-bg": "linear-gradient(135deg, #051520, #0a2535, #103548)", "--color-bg-muted": "#081d2a", "--color-surface": "#0d2d3e", "--color-border": "#154055", "--color-primary": "#80deea", "--color-primary-dark": "#00acc1", "--color-text": "#e0f7fa", "--color-text-muted": "#80cbc4", "--color-text-on-primary": "#012c36", "--color-hover": "#103040", "--color-shadow": "rgba(128,222,234,0.25)" },
  },
  {
    id: "blood_moon", name: "Blood Moon",
    colors: ["#180003", "#350008", "#550010"], primary: "#ef5350",
    vars: { "--color-bg": "linear-gradient(135deg, #180003, #350008, #550010)", "--color-bg-muted": "#200005", "--color-surface": "#2e0008", "--color-border": "#450010", "--color-primary": "#ef5350", "--color-primary-dark": "#c62828", "--color-text": "#ffebee", "--color-text-muted": "#ef9a9a", "--color-text-on-primary": "#ffffff", "--color-hover": "#3a000a", "--color-shadow": "rgba(239,83,80,0.3)" },
  },
  {
    id: "jade_gate", name: "Jade Gate",
    colors: ["#001a0d", "#003320", "#004d30"], primary: "#26a69a",
    vars: { "--color-bg": "linear-gradient(135deg, #001a0d, #003320, #004d30)", "--color-bg-muted": "#001f10", "--color-surface": "#002a1a", "--color-border": "#003d28", "--color-primary": "#26a69a", "--color-primary-dark": "#00796b", "--color-text": "#e8f5e9", "--color-text-muted": "#80cbc4", "--color-text-on-primary": "#ffffff", "--color-hover": "#003020", "--color-shadow": "rgba(38,166,154,0.25)" },
  },
  {
    id: "bronze_dynasty", name: "Bronze Dynasty",
    colors: ["#1a0e00", "#3d2200", "#6b3a00"], primary: "#ffa726",
    vars: { "--color-bg": "linear-gradient(135deg, #1a0e00, #3d2200, #6b3a00)", "--color-bg-muted": "#221200", "--color-surface": "#2e1a00", "--color-border": "#4a2a00", "--color-primary": "#ffa726", "--color-primary-dark": "#f57c00", "--color-text": "#fff3e0", "--color-text-muted": "#ffcc80", "--color-text-on-primary": "#1a0a00", "--color-hover": "#3a2200", "--color-shadow": "rgba(255,167,38,0.25)" },
  },
  {
    id: "electric_violet", name: "Electric Violet",
    colors: ["#0d0018", "#1a003d", "#28006b"], primary: "#7c4dff",
    vars: { "--color-bg": "linear-gradient(135deg, #0d0018, #1a003d, #28006b)", "--color-bg-muted": "#100020", "--color-surface": "#180035", "--color-border": "#280055", "--color-primary": "#7c4dff", "--color-primary-dark": "#651fff", "--color-text": "#ede7f6", "--color-text-muted": "#b39ddb", "--color-text-on-primary": "#ffffff", "--color-hover": "#200045", "--color-shadow": "rgba(124,77,255,0.3)" },
  },
  {
    id: "steel_storm", name: "Steel Storm",
    colors: ["#080d15", "#101825", "#182535"], primary: "#78909c",
    vars: { "--color-bg": "linear-gradient(135deg, #080d15, #101825, #182535)", "--color-bg-muted": "#0c1320", "--color-surface": "#141e2e", "--color-border": "#1e2d40", "--color-primary": "#78909c", "--color-primary-dark": "#546e7a", "--color-text": "#eceff1", "--color-text-muted": "#90a4ae", "--color-text-on-primary": "#ffffff", "--color-hover": "#182030", "--color-shadow": "rgba(120,144,156,0.25)" },
  },
  {
    id: "desert_mirage", name: "Desert Mirage",
    colors: ["#1a1200", "#3d2a00", "#5a3d00"], primary: "#ffb300",
    vars: { "--color-bg": "linear-gradient(135deg, #1a1200, #3d2a00, #5a3d00)", "--color-bg-muted": "#221600", "--color-surface": "#2e2000", "--color-border": "#4a3200", "--color-primary": "#ffb300", "--color-primary-dark": "#f57c00", "--color-text": "#fff8e1", "--color-text-muted": "#ffe082", "--color-text-on-primary": "#1a0e00", "--color-hover": "#3a2800", "--color-shadow": "rgba(255,179,0,0.25)" },
  },
  {
    id: "viper_green", name: "Viper Green",
    colors: ["#020a02", "#051805", "#082808"], primary: "#69f0ae",
    vars: { "--color-bg": "linear-gradient(135deg, #020a02, #051805, #082808)", "--color-bg-muted": "#041004", "--color-surface": "#071808", "--color-border": "#0f280f", "--color-primary": "#69f0ae", "--color-primary-dark": "#00c853", "--color-text": "#e8f5e9", "--color-text-muted": "#a5d6a7", "--color-text-on-primary": "#001a0a", "--color-hover": "#0a2008", "--color-shadow": "rgba(105,240,174,0.25)" },
  },
  {
    id: "polar_night", name: "Polar Night",
    colors: ["#020d10", "#051a20", "#082830"], primary: "#4dd0e1",
    vars: { "--color-bg": "linear-gradient(135deg, #020d10, #051a20, #082830)", "--color-bg-muted": "#041318", "--color-surface": "#082028", "--color-border": "#0f2f3d", "--color-primary": "#4dd0e1", "--color-primary-dark": "#00acc1", "--color-text": "#e0f7fa", "--color-text-muted": "#80deea", "--color-text-on-primary": "#012025", "--color-hover": "#0a2230", "--color-shadow": "rgba(77,208,225,0.25)" },
  },
  {
    id: "rose_obsession", name: "Rose Obsession",
    colors: ["#1a0510", "#3d0d25", "#5a1538"], primary: "#f48fb1",
    vars: { "--color-bg": "linear-gradient(135deg, #1a0510, #3d0d25, #5a1538)", "--color-bg-muted": "#220818", "--color-surface": "#320a22", "--color-border": "#4a1030", "--color-primary": "#f48fb1", "--color-primary-dark": "#e91e63", "--color-text": "#fce4ec", "--color-text-muted": "#f48fb1", "--color-text-on-primary": "#1a0010", "--color-hover": "#3d1028", "--color-shadow": "rgba(244,143,177,0.3)" },
  },
  {
    id: "starfield", name: "Starfield",
    colors: ["#020208", "#050510", "#08081a"], primary: "#448aff",
    vars: { "--color-bg": "linear-gradient(135deg, #020208, #050510, #08081a)", "--color-bg-muted": "#050510", "--color-surface": "#080812", "--color-border": "#10101e", "--color-primary": "#448aff", "--color-primary-dark": "#1565c0", "--color-text": "#e8eaf6", "--color-text-muted": "#9fa8da", "--color-text-on-primary": "#ffffff", "--color-hover": "#0c0c1a", "--color-shadow": "rgba(68,138,255,0.25)" },
  },
  {
    id: "phantom_black", name: "Phantom Black",
    colors: ["#080808", "#100f14", "#181520"], primary: "#e0e0e0",
    vars: { "--color-bg": "linear-gradient(135deg, #080808, #100f14, #181520)", "--color-bg-muted": "#0f0e12", "--color-surface": "#131218", "--color-border": "#1e1c25", "--color-primary": "#e0e0e0", "--color-primary-dark": "#9e9e9e", "--color-text": "#f5f5f5", "--color-text-muted": "#757575", "--color-text-on-primary": "#080808", "--color-hover": "#1a1820", "--color-shadow": "rgba(255,255,255,0.1)" },
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

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("dark", "light", "sado", "majls");
    root.classList.add(theme);
    localStorage.setItem("app-theme", theme);
    requestAnimationFrame(() => syncElectronTitleBar());
  }, [theme]);

  // Gradient + theme effect: inject/remove CSS variable overrides
  useEffect(() => {
    const gradient = buildGradient(colors);
    document.documentElement.style.setProperty("--theme-gradient", gradient);
    localStorage.setItem("app-color-theme", colorTheme);

    if (isGradientActive) {
      applyGradientOverrides(colors, isGradientLight);

      // Apply per-theme --color-* variables and primary accent
      const preset = COLOR_THEME_PRESETS.find(p => p.id === colorTheme);
      const root = document.documentElement;
      if (preset?.vars) {
        Object.entries(preset.vars).forEach(([k, v]) => root.style.setProperty(k, v));
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
      removeGradientOverrides();
      requestAnimationFrame(() => syncElectronTitleBar());
    }
  }, [colorTheme, theme, colors, isGradientActive, isGradientLight]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggleTheme = () => setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  const setColorTheme = (id: string) => setColorThemeState(id);

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
