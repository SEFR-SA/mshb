import React, { createContext, useContext, useState, useCallback } from "react";

interface AudioSettings {
  globalMuted: boolean;
  globalDeafened: boolean;
  toggleGlobalMute: () => void;
  toggleGlobalDeafen: () => void;
}

const AudioSettingsContext = createContext<AudioSettings>({
  globalMuted: false,
  globalDeafened: false,
  toggleGlobalMute: () => {},
  toggleGlobalDeafen: () => {},
});

export const useAudioSettings = () => useContext(AudioSettingsContext);

export const AudioSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [globalMuted, setGlobalMuted] = useState(false);
  const [globalDeafened, setGlobalDeafened] = useState(false);

  const toggleGlobalMute = useCallback(() => {
    setGlobalMuted((prev) => !prev);
  }, []);

  const toggleGlobalDeafen = useCallback(() => {
    setGlobalDeafened((prev) => {
      const next = !prev;
      // Deafen implies mute
      if (next) setGlobalMuted(true);
      return next;
    });
  }, []);

  return (
    <AudioSettingsContext.Provider value={{ globalMuted, globalDeafened, toggleGlobalMute, toggleGlobalDeafen }}>
      {children}
    </AudioSettingsContext.Provider>
  );
};
