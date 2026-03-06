export interface Nameplate {
  id: string;
  name: string;
  url: string;
  animated?: boolean;
}

/**
 * Curated nameplate library.
 * Add new nameplates here — the UI will pick them up automatically.
 * Use APNG or WebP for animated nameplates (no GIFs).
 * Recommended dimensions: 600 × 80 px (or 1200 × 160 px @2×).
 */
export const NAMEPLATES: Nameplate[] = [
  { id: "midnight-gradient", name: "Midnight Gradient", url: "https://placehold.co/600x80/1a1a2e/e94560?text=Midnight" },
  { id: "ocean-breeze", name: "Ocean Breeze", url: "https://placehold.co/600x80/0f3460/16a085?text=Ocean" },
  { id: "sunset-glow", name: "Sunset Glow", url: "https://placehold.co/600x80/ff6b35/f7931e?text=Sunset" },
  { id: "aurora", name: "Aurora", url: "https://placehold.co/600x80/6b5b95/d64161?text=Aurora" },
  { id: "emerald-wave", name: "Emerald Wave", url: "https://placehold.co/600x80/2d6a4f/52b788?text=Emerald" },
  { id: "royal-purple", name: "Royal Purple", url: "https://placehold.co/600x80/4a0e4e/845ec2?text=Royal" },
];
