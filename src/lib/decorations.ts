export interface AvatarDecoration {
  id: string;
  name: string;
  url: string;
  animated?: boolean;
}

/**
 * Curated avatar decoration library.
 * Add new decorations here — the UI will pick them up automatically.
 * Use APNG or WebP for animated decorations (no GIFs).
 */
export const DECORATIONS: AvatarDecoration[] = [
  { id: "pixel-duck", name: "Pixel Duck", url: "https://placehold.co/128x128/transparent/orange?text=🦆" },
  { id: "pixel-hearts", name: "Pixel Hearts", url: "https://placehold.co/128x128/transparent/pink?text=💕" },
  { id: "pixel-stars", name: "Pixel Stars", url: "https://placehold.co/128x128/transparent/gold?text=⭐" },
  { id: "pixel-flame", name: "Pixel Flame", url: "https://placehold.co/128x128/transparent/red?text=🔥" },
  { id: "pixel-sparkle", name: "Sparkle Ring", url: "https://placehold.co/128x128/transparent/purple?text=✨" },
  { id: "pixel-crown", name: "Crown", url: "https://placehold.co/128x128/transparent/gold?text=👑" },
];
