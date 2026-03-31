import { useState, useRef } from "react";

export interface GameOverlaySettings {
  enabled: boolean;
  avatarSize: "LARGE" | "SMALL";
  displayNames: "ALWAYS" | "ONLY_SPEAKING" | "NEVER";
  displayUsers: "ALWAYS" | "ONLY_SPEAKING";
  notificationPosition: "TOP_LEFT" | "TOP_RIGHT" | "BOTTOM_LEFT" | "BOTTOM_RIGHT";
}

const STORAGE_KEY = "mshb_overlay_settings";

const DEFAULTS: GameOverlaySettings = {
  enabled: false,
  avatarSize: "LARGE",
  displayNames: "ALWAYS",
  displayUsers: "ALWAYS",
  notificationPosition: "TOP_LEFT",
};

export const loadOverlaySettings = (): GameOverlaySettings => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
};

export const useGameOverlaySettings = () => {
  const [settings, setSettings] = useState<GameOverlaySettings>(loadOverlaySettings);
  const originalRef = useRef<string>(JSON.stringify(loadOverlaySettings()));

  const isDirty = JSON.stringify(settings) !== originalRef.current;

  const update = (partial: Partial<GameOverlaySettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    originalRef.current = JSON.stringify(settings);
  };

  const reset = () => {
    const original: GameOverlaySettings = JSON.parse(originalRef.current);
    setSettings(original);
  };

  return { settings, update, save, reset, isDirty };
};
