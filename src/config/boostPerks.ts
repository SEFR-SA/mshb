export interface BoostPerks {
  maxEmojis: number;
  maxStickers: number;
  maxUploadSizeMB: number;
  audioQualityKbps: number;
  maxScreenShareRes: "1080p" | "1440p" | "4k";
  maxScreenShareFps: 30 | 60;
  features: string[];
}

export const BOOST_PERKS: Record<0 | 1 | 2 | 3, BoostPerks> = {
  0: { maxEmojis: 50,  maxStickers: 5,  maxUploadSizeMB: 8,   audioQualityKbps: 96,  maxScreenShareRes: "1080p", maxScreenShareFps: 30, features: [] },
  1: { maxEmojis: 100, maxStickers: 15, maxUploadSizeMB: 8,   audioQualityKbps: 128, maxScreenShareRes: "1080p", maxScreenShareFps: 60, features: ["animated_icon", "server_banner"] },
  2: { maxEmojis: 150, maxStickers: 30, maxUploadSizeMB: 50,  audioQualityKbps: 256, maxScreenShareRes: "1440p", maxScreenShareFps: 60, features: ["animated_icon", "server_banner", "hd_voice"] },
  3: { maxEmojis: 250, maxStickers: 60, maxUploadSizeMB: 100, audioQualityKbps: 384, maxScreenShareRes: "4k",    maxScreenShareFps: 60, features: ["animated_icon", "server_banner", "hd_voice", "vanity_url"] },
};

export const getBoostPerks = (level: number): BoostPerks =>
  BOOST_PERKS[Math.min(Math.max(Math.floor(level), 0), 3) as 0 | 1 | 2 | 3];
