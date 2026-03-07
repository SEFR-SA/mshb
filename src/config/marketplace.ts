// ─── Item Types ───────────────────────────────────────────────────────────────

export const ITEM_TYPES = [
  "avatar_decoration",
  "profile_effect",
  "nameplate",
  "tag",
  "bundle",
] as const;

export type ItemType = typeof ITEM_TYPES[number];

// ─── File Validation ──────────────────────────────────────────────────────────

export const ALLOWED_ASSET_EXTENSIONS = [".webp", ".apng", ".svg", ".png"] as const;

// APNG files are PNG-compatible and share the image/png MIME type
export const ALLOWED_MIME_TYPES = [
  "image/webp",
  "image/png",     // covers .apng (Animated PNG)
  "image/svg+xml",
] as const;

export function isAllowedAssetFile(file: File): boolean {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return (ALLOWED_ASSET_EXTENSIONS as readonly string[]).includes(ext);
}

// ─── Display Config ───────────────────────────────────────────────────────────

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  avatar_decoration: "Avatar Decoration",
  profile_effect:    "Profile Effect",
  nameplate:         "Nameplate",
  tag:               "Tag",
  bundle:            "Bundle",
};

// Gradient fallbacks used when thumbnail images fail to load (e.g. Electron file:// origin)
export const ITEM_TYPE_GRADIENTS: Record<ItemType, string> = {
  avatar_decoration: "linear-gradient(135deg, #2d1b69 0%, #11998e 100%)",
  profile_effect:    "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
  nameplate:         "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
  tag:               "linear-gradient(135deg, #c94b4b 0%, #4b134f 100%)",
  bundle:            "linear-gradient(135deg, #f7971e 0%, #ffd200 100%)",
};
