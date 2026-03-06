export { FONT_STYLES, type FontStyle } from "@/lib/unicodeFonts";

export type NameEffect = "Solid" | "Gradient" | "Neon" | "Toon" | "Pop";

export const EFFECT_OPTIONS: { id: NameEffect; label: string }[] = [
  { id: "Solid",    label: "Solid"    },
  { id: "Gradient", label: "Gradient" },
  { id: "Neon",     label: "Neon"     },
  { id: "Toon",     label: "Toon"     },
  { id: "Pop",      label: "Pop"      },
];

// 20 swatches in two rows of 10
export const COLOR_SWATCHES = [
  "#000000", "#FFFFFF",
  "#FF4040", "#FF8800", "#FFD700", "#22CC44", "#00AAFF", "#8833FF", "#FF33CC", "#FF6666",
  "#44DDAA", "#FF5500", "#AAEE00", "#00DDFF", "#BB44FF", "#FF44AA", "#44CCFF", "#FFAA00",
  "#88FF44", "#FF77BB",
];
