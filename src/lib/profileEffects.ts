export interface ProfileEffect {
  id: string;
  name: string;
  url: string;
  animated?: boolean;
}

/**
 * Curated profile effect library.
 * Add new effects here — the UI will pick them up automatically.
 * Use APNG or WebP for animated effects (no GIFs).
 * Recommended dimensions: 440 × 580 px (matching the profile card size).
 */
export const PROFILE_EFFECTS: ProfileEffect[] = [
  { id: "floating-hearts", name: "Floating Hearts", url: "https://placehold.co/440x580/transparent/ff69b4?text=💕", animated: true },
  { id: "sparkle-burst", name: "Sparkle Burst", url: "https://placehold.co/440x580/transparent/ffd700?text=✨", animated: true },
  { id: "flame-aura", name: "Flame Aura", url: "https://placehold.co/440x580/transparent/ff4500?text=🔥", animated: true },
  { id: "snowfall", name: "Snowfall", url: "https://placehold.co/440x580/transparent/b0e0e6?text=❄️", animated: true },
  { id: "galaxy-swirl", name: "Galaxy Swirl", url: "https://placehold.co/440x580/transparent/9b59b6?text=🌌", animated: true },
  { id: "cherry-blossoms", name: "Cherry Blossoms", url: "https://placehold.co/440x580/transparent/ffb7c5?text=🌸", animated: true },
];
