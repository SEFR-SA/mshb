export interface AvatarDecoration {
  id: string;
  name: string;
  url: string;
  animated?: boolean;
}

export const DECORATIONS: AvatarDecoration[] = [
  { id: "glitch-effect", name: "Glitch Effect", url: "https://cdn.discordapp.com/avatar-decoration-presets/a_e90ebc0114e7bdc30353c8b11953ea41.png?size=96&passthrough=true", animated: true },
  { id: "golden-crown", name: "Golden Crown", url: "https://cdn.discordapp.com/avatar-decoration-presets/a_65db91cee351e36150a2b506b26eba71.png?size=96&passthrough=true", animated: true },
  { id: "floating-hearts", name: "Floating Hearts", url: "https://cdn.discordapp.com/avatar-decoration-presets/a_3e1fc3c7ee2e34e8176f4737427e8f4f.png?size=96&passthrough=true", animated: true },
  { id: "sakura-blossoms", name: "Sakura Blossoms", url: "https://cdn.discordapp.com/avatar-decoration-presets/a_13913a00bd9990ab4102a3bf069f0f3f.png?size=96&passthrough=true", animated: true },
  { id: "pink-flame", name: "Pink Flame", url: "https://wqgotyhepamnwsjcydpy.supabase.co/storage/v1/object/public/avatar-decorations//a_d1e5d3aabccb3d38f21b5ac8a33fcf.png", animated: true },
];
