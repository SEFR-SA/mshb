export type FontStyle =
  | "Normal"
  | "Bold"
  | "Italic"
  | "BoldItalic"
  | "Script"
  | "BoldScript"
  | "Fraktur"
  | "BoldFraktur"
  | "DoubleStruck"
  | "Monospace"
  | "SansSerif"
  | "SansBold";

// Unicode mathematical alphanumeric symbols offsets
// Each style maps uppercase A (0x41) and lowercase a (0x61) to a starting code point
const STYLE_OFFSETS: Record<FontStyle, { upper: number; lower: number; digits?: number } | null> = {
  Normal: null,
  Bold: { upper: 0x1D400, lower: 0x1D41A, digits: 0x1D7CE },
  Italic: { upper: 0x1D434, lower: 0x1D44E },
  BoldItalic: { upper: 0x1D468, lower: 0x1D482 },
  Script: { upper: 0x1D49C, lower: 0x1D4B6 },
  BoldScript: { upper: 0x1D4D0, lower: 0x1D4EA },
  Fraktur: { upper: 0x1D504, lower: 0x1D51E },
  BoldFraktur: { upper: 0x1D56C, lower: 0x1D586 },
  DoubleStruck: { upper: 0x1D538, lower: 0x1D552, digits: 0x1D7D8 },
  Monospace: { upper: 0x1D670, lower: 0x1D68A, digits: 0x1D7F6 },
  SansSerif: { upper: 0x1D5A0, lower: 0x1D5BA, digits: 0x1D7E2 },
  SansBold: { upper: 0x1D5D4, lower: 0x1D5EE, digits: 0x1D7EC },
};

// Some characters have special code points that don't follow the offset pattern
const EXCEPTIONS: Partial<Record<FontStyle, Record<string, number>>> = {
  Script: {
    B: 0x212C, // ℬ
    E: 0x2130, // ℰ
    F: 0x2131, // ℱ
    H: 0x210B, // ℋ
    I: 0x2110, // ℐ
    L: 0x2112, // ℒ
    M: 0x2133, // ℳ
    R: 0x211B, // ℛ
    e: 0x212F, // ℯ
    g: 0x210A, // ℊ
    o: 0x2134, // ℴ
  },
  Fraktur: {
    C: 0x212D, // ℭ
    H: 0x210C, // ℌ
    I: 0x2111, // ℑ
    R: 0x211C, // ℜ
    Z: 0x2128, // ℨ
  },
  DoubleStruck: {
    C: 0x2102, // ℂ
    H: 0x210D, // ℍ
    N: 0x2115, // ℕ
    P: 0x2119, // ℙ
    Q: 0x211A, // ℚ
    R: 0x211D, // ℝ
    Z: 0x2124, // ℤ
  },
  Italic: {
    h: 0x210E, // ℎ (Planck constant)
  },
};

export function convertToFont(text: string, style: FontStyle): string {
  if (style === "Normal") return text;

  const offsets = STYLE_OFFSETS[style];
  if (!offsets) return text;

  const exceptions = EXCEPTIONS[style] || {};

  return Array.from(text)
    .map((char) => {
      // Check exceptions first
      if (exceptions[char]) {
        return String.fromCodePoint(exceptions[char]);
      }

      const code = char.charCodeAt(0);

      // Uppercase A-Z
      if (code >= 0x41 && code <= 0x5A) {
        return String.fromCodePoint(offsets.upper + (code - 0x41));
      }

      // Lowercase a-z
      if (code >= 0x61 && code <= 0x7A) {
        return String.fromCodePoint(offsets.lower + (code - 0x61));
      }

      // Digits 0-9
      if (code >= 0x30 && code <= 0x39 && offsets.digits) {
        return String.fromCodePoint(offsets.digits + (code - 0x30));
      }

      return char;
    })
    .join("");
}

/**
 * Attempt to reverse a Unicode-styled character back to plain ASCII.
 */
export function revertToPlain(text: string): string {
  const result: string[] = [];

  for (const char of text) {
    const cp = char.codePointAt(0)!;
    let found = false;

    // Check all exception maps
    for (const [, excMap] of Object.entries(EXCEPTIONS)) {
      if (!excMap) continue;
      for (const [ascii, uniCp] of Object.entries(excMap)) {
        if (cp === uniCp) {
          result.push(ascii);
          found = true;
          break;
        }
      }
      if (found) break;
    }
    if (found) continue;

    // Check offset ranges
    for (const [, offsets] of Object.entries(STYLE_OFFSETS)) {
      if (!offsets) continue;
      // Upper
      if (cp >= offsets.upper && cp < offsets.upper + 26) {
        result.push(String.fromCharCode(0x41 + (cp - offsets.upper)));
        found = true;
        break;
      }
      // Lower
      if (cp >= offsets.lower && cp < offsets.lower + 26) {
        result.push(String.fromCharCode(0x61 + (cp - offsets.lower)));
        found = true;
        break;
      }
      // Digits
      if (offsets.digits && cp >= offsets.digits && cp < offsets.digits + 10) {
        result.push(String.fromCharCode(0x30 + (cp - offsets.digits)));
        found = true;
        break;
      }
    }

    if (!found) result.push(char);
  }

  return result.join("");
}

export const FONT_STYLES: { id: FontStyle; label: string; preview: string }[] = [
  { id: "Normal", label: "Normal", preview: "Abc" },
  { id: "Bold", label: "Bold", preview: convertToFont("Abc", "Bold") },
  { id: "Italic", label: "Italic", preview: convertToFont("Abc", "Italic") },
  { id: "Script", label: "Script", preview: convertToFont("Abc", "Script") },
  { id: "BoldScript", label: "Bold Script", preview: convertToFont("Abc", "BoldScript") },
  { id: "Fraktur", label: "Fraktur", preview: convertToFont("Abc", "Fraktur") },
  { id: "DoubleStruck", label: "Double Struck", preview: convertToFont("Abc", "DoubleStruck") },
  { id: "Monospace", label: "Monospace", preview: convertToFont("Abc", "Monospace") },
  { id: "SansSerif", label: "Sans Serif", preview: convertToFont("Abc", "SansSerif") },
  { id: "SansBold", label: "Sans Bold", preview: convertToFont("Abc", "SansBold") },
];
