import React, { createContext, useContext, useState, useCallback } from "react";
import { playSound } from "@/lib/soundManager";

interface AudioSettings {
  globalMuted: boolean;
  globalDeafened: boolean;
  setGlobalMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setGlobalDeafened: React.Dispatch<React.SetStateAction<boolean>>;
  toggleGlobalMute: () => void;
  toggleGlobalDeafen: () => void;
}

const AudioSettingsContext = createContext<AudioSettings>({
  globalMuted: false,
  globalDeafened: false,
  setGlobalMuted: () => { },
  setGlobalDeafened: () => { },
  toggleGlobalMute: () => { },
  toggleGlobalDeafen: () => { },
});

export const useAudioSettings = () => useContext(AudioSettingsContext);

export const AudioSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [globalMuted, setGlobalMuted] = useState(false);
  const [globalDeafened, setGlobalDeafened] = useState(false);

  const toggleGlobalMute = useCallback(() => {
    setGlobalMuted((prev) => {
      playSound(prev ? "unmute" : "mute");
      if (prev) setGlobalDeafened(false); // unmuting also clears deafen
      return !prev;
    });
  }, []);

  const toggleGlobalDeafen = useCallback(() => {
    setGlobalDeafened((prev) => {
      const next = !prev;
      playSound(prev ? "undeafen" : "deafen");
      if (next) setGlobalMuted(true);   // deafening also mutes
      else setGlobalMuted(false);       // undeafening also unmutes
      return next;
    });
  }, []);

  return (
    <AudioSettingsContext.Provider value={{ globalMuted, globalDeafened, setGlobalMuted, setGlobalDeafened, toggleGlobalMute, toggleGlobalDeafen }}>
      {children}
    </AudioSettingsContext.Provider>
  );
};
