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
  { id: "pink-flame", name: "Pink Flame", url: "https://wqgotyhepamnwsjcydpy.supabase.co/storage/v1/object/public/profile-effect//7a7173a103bd32107c451319a6f5fb7bf015de212587e843fceab4c0dffdb198.png", animated: true },
  { id: "black-birds", name: "Black Birds", url: "https://wqgotyhepamnwsjcydpy.supabase.co/storage/v1/object/public/profile-effect//d.webp", animated: true },

];
