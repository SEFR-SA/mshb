import React, { createContext, useContext, useState, useCallback } from "react";

interface VoiceChannel {
  id: string;
  name: string;
  serverId: string;
}

interface VoiceChannelContextType {
  voiceChannel: VoiceChannel | null;
  setVoiceChannel: (channel: VoiceChannel | null) => void;
  disconnectVoice: () => void;
}

const VoiceChannelContext = createContext<VoiceChannelContextType>({
  voiceChannel: null,
  setVoiceChannel: () => {},
  disconnectVoice: () => {},
});

export const useVoiceChannel = () => useContext(VoiceChannelContext);

export const VoiceChannelProvider = ({ children }: { children: React.ReactNode }) => {
  const [voiceChannel, setVoiceChannel] = useState<VoiceChannel | null>(null);

  const disconnectVoice = useCallback(() => {
    setVoiceChannel(null);
  }, []);

  return (
    <VoiceChannelContext.Provider value={{ voiceChannel, setVoiceChannel, disconnectVoice }}>
      {children}
    </VoiceChannelContext.Provider>
  );
};
