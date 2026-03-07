export interface FontDef {
  id:     string;
  label:  string;
  family: string;
}

export type FontStyle = string;

export const FONT_STYLES: FontDef[] = [
  { id: "Normal",        label: "Hello",        family: "inherit"       },
  { id: "DalekPinpoint", label: "Hello", family: "DalekPinpoint" },
  { id: "Ethnocentric",  label: "Hello",  family: "Ethnocentric"  },
  { id: "GrimeSlime",    label: "Hello",    family: "GrimeSlime"    },
  { id: "MidnightAngel", label: "Hello", family: "MidnightAngel" },
  { id: "Sakuna",        label: "Hello",         family: "Sakuna"        },
  { id: "SuperMario",    label: "Hello",    family: "SuperMario"    },
  { id: "Upheaval",      label: "Hello",       family: "Upheaval"      },
];

export type NameEffect = "Solid" | "Gradient" | "Neon" | "Toon" | "Pop";

export const EFFECT_OPTIONS: { id: NameEffect; label: string }[] = [
  { id: "Solid",    label: "GG"    },
  { id: "Gradient", label: "GG" },
];

// 20 swatches in two rows of 10
export const COLOR_SWATCHES = [
  "#000000", "#FFFFFF",
  "#FF4040", "#FF8800", "#FFD700", "#22CC44", "#00AAFF", "#8833FF", "#FF33CC",
];
