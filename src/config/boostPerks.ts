export interface BoostPerks {
  maxEmojis: number;
  maxStickers: number;
  maxUploadSizeMB: number;
  audioQualityKbps: number; // reserved for server voice channels when implemented
  features: string[];
}

export const BOOST_PERKS: Record<0 | 1 | 2 | 3, BoostPerks> = {
  0: { maxEmojis: 50,  maxStickers: 5,  maxUploadSizeMB: 8,   audioQualityKbps: 96,  features: [] },
  1: { maxEmojis: 100, maxStickers: 15, maxUploadSizeMB: 8,   audioQualityKbps: 128, features: ["animated_icon", "server_banner"] },
  2: { maxEmojis: 150, maxStickers: 30, maxUploadSizeMB: 50,  audioQualityKbps: 256, features: ["animated_icon", "server_banner", "hd_voice"] },
  3: { maxEmojis: 250, maxStickers: 60, maxUploadSizeMB: 100, audioQualityKbps: 384, features: ["animated_icon", "server_banner", "hd_voice", "vanity_url"] },
};

export const getBoostPerks = (level: number): BoostPerks =>
  BOOST_PERKS[Math.min(Math.max(Math.floor(level), 0), 3) as 0 | 1 | 2 | 3];
