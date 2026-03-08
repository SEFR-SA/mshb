import { useEffect } from "react";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";

/**
 * Global keyboard shortcuts that work app-wide:
 * - Ctrl+Shift+M → Toggle mute
 * - Ctrl+Shift+D → Toggle deafen
 */
export const useGlobalKeybinds = () => {
  const { toggleGlobalMute, toggleGlobalDeafen } = useAudioSettings();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "M") {
        e.preventDefault();
        toggleGlobalMute();
      }
      if (e.ctrlKey && e.shiftKey && e.key.toUpperCase() === "D") {
        e.preventDefault();
        toggleGlobalDeafen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleGlobalMute, toggleGlobalDeafen]);
};
