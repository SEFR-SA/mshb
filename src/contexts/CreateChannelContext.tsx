import React, { createContext, useContext, useState, useCallback } from "react";

type CreateChannelMode = "channel" | "section" | null;

interface CreateChannelContextValue {
  pendingMode: CreateChannelMode;
  requestCreateChannel: () => void;
  requestCreateSection: () => void;
  consumeRequest: () => CreateChannelMode;
}

const CreateChannelContext = createContext<CreateChannelContextValue>({
  pendingMode: null,
  requestCreateChannel: () => {},
  requestCreateSection: () => {},
  consumeRequest: () => null,
});

export const useCreateChannel = () => useContext(CreateChannelContext);

export const CreateChannelProvider = ({ children }: { children: React.ReactNode }) => {
  const [pendingMode, setPendingMode] = useState<CreateChannelMode>(null);

  const requestCreateChannel = useCallback(() => setPendingMode("channel"), []);
  const requestCreateSection = useCallback(() => setPendingMode("section"), []);
  const consumeRequest = useCallback(() => {
    const mode = pendingMode;
    setPendingMode(null);
    return mode;
  }, [pendingMode]);

  return (
    <CreateChannelContext.Provider value={{ pendingMode, requestCreateChannel, requestCreateSection, consumeRequest }}>
      {children}
    </CreateChannelContext.Provider>
  );
};
