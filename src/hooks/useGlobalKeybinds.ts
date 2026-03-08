import { useEffect } from "react";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { useStreamerMode } from "@/contexts/StreamerModeContext";
import { toast } from "@/hooks/use-toast";

/**
 * Global keyboard shortcuts that work app-wide:
 * - Ctrl+Shift+M → Toggle mute
 * - Ctrl+Shift+D → Toggle deafen
 * - Ctrl+Shift+S → Toggle Streamer Mode
 */
export const useGlobalKeybinds = () => {
  const { toggleGlobalMute, toggleGlobalDeafen } = useAudioSettings();
  const { isStreamerMode, toggleStreamerMode } = useStreamerMode();

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
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toUpperCase() === "S") {
        e.preventDefault();
        toggleStreamerMode();
        toast({
          title: !isStreamerMode ? "Streamer Mode Enabled" : "Streamer Mode Disabled",
          description: !isStreamerMode
            ? "Notifications, sounds, and sensitive info are now hidden."
            : "Notifications and info are visible again.",
          duration: 3000,
        });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleGlobalMute, toggleGlobalDeafen, isStreamerMode, toggleStreamerMode]);
};
