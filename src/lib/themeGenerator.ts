import type { ColorThemePreset } from "@/contexts/ThemeContext";

/** Convert hex (#rrggbb) → { h: 0-360, s: 0-100, l: 0-100 } */
function hexToHsl(hex: string): { h: number; s: number; l: number } {
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
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** Convert HSL → hex */
function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Clamp a value between min and max */
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export type ThemeMode = "light" | "dark" | "auto";

/**
 * Generate a complete solid theme preset from a single hex color.
 * Mode "auto" picks light-bg for dark/vivid primaries and dark-bg for light primaries.
 */
export function generateThemeFromColor(
  inputHex: string,
  mode: ThemeMode = "auto"
): ColorThemePreset {
  const { h, s, l } = hexToHsl(inputHex);

  // Auto-detect: if the primary is light (L > 60), use dark background
  const useDark = mode === "dark" || (mode === "auto" && l > 60);

  const vars: Record<string, string> = {};

  if (useDark) {
    // ─── Dark background variant ─────────────────────────────────────
    vars["--color-primary"]         = inputHex;
    vars["--color-primary-dark"]    = hslToHex(h, clamp(s, 0, 100), clamp(l - 15, 5, 95));
    vars["--color-hover"]           = hslToHex(h, clamp(s, 0, 100), clamp(l + 8, 5, 95));
    vars["--color-bg"]              = hslToHex(h, clamp(Math.round(s * 0.08), 0, 100), 8);
    vars["--color-bg-muted"]        = hslToHex(h, clamp(Math.round(s * 0.10), 0, 100), 12);
    vars["--color-surface"]         = hslToHex(h, clamp(Math.round(s * 0.08), 0, 100), 10);
    vars["--color-border"]          = hslToHex(h, clamp(Math.round(s * 0.12), 0, 100), 18);
    vars["--color-text"]            = hslToHex(h, clamp(Math.round(s * 0.06), 0, 100), 96);
    vars["--color-text-muted"]      = hslToHex(h, clamp(Math.round(s * 0.10), 0, 100), 65);
    vars["--color-text-on-primary"] = "#ffffff";
    vars["--color-shadow"]          = "rgba(0, 0, 0, 0.3)";
  } else {
    // ─── Light background variant ────────────────────────────────────
    vars["--color-primary"]         = inputHex;
    vars["--color-primary-dark"]    = hslToHex(h, clamp(s, 0, 100), clamp(l - 15, 5, 95));
    vars["--color-hover"]           = hslToHex(h, clamp(s, 0, 100), clamp(l - 12, 5, 95));
    vars["--color-bg"]              = hslToHex(h, clamp(Math.round(s * 0.08), 0, 100), 98);
    vars["--color-bg-muted"]        = hslToHex(h, clamp(Math.round(s * 0.10), 0, 100), 94);
    vars["--color-surface"]         = "#ffffff";
    vars["--color-border"]          = hslToHex(h, clamp(Math.round(s * 0.12), 0, 100), 89);
    vars["--color-text"]            = hslToHex(h, clamp(Math.round(s * 0.20), 0, 100), 18);
    vars["--color-text-muted"]      = hslToHex(h, clamp(Math.round(s * 0.15), 0, 100), 42);
    vars["--color-text-on-primary"] = "#ffffff";
    vars["--color-shadow"]          = "rgba(0, 0, 0, 0.06)";
  }

  const bgHex = vars["--color-bg"];

  return {
    id: "custom",
    name: "Custom",
    colors: [bgHex],
    primary: inputHex,
    solid: true,
    vars,
  };
}

/**
 * Generate a random vivid theme.
 * H: 0–360, S: 65–85%, L: 48–58% → always vibrant, never muddy.
 */
export function generateRandomTheme(mode: ThemeMode = "auto"): {
  preset: ColorThemePreset;
  hex: string;
} {
  const h = Math.floor(Math.random() * 360);
  const s = 65 + Math.floor(Math.random() * 21);   // 65–85
  const l = 48 + Math.floor(Math.random() * 11);   // 48–58
  const hex = hslToHex(h, s, l);
  return { preset: generateThemeFromColor(hex, mode), hex };
}
