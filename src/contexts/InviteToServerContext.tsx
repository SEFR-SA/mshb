import React, { createContext, useContext, useState, useCallback } from "react";

interface InviteToServerState {
  isOpen: boolean;
  targetUserId: string | null;
  openInviteToServer: (userId: string) => void;
  close: () => void;
}

const InviteToServerContext = createContext<InviteToServerState>({
  isOpen: false,
  targetUserId: null,
  openInviteToServer: () => {},
  close: () => {},
});

export const useInviteToServer = () => useContext(InviteToServerContext);

export const InviteToServerProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);

  const openInviteToServer = useCallback((userId: string) => {
    setTargetUserId(userId);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setTargetUserId(null);
  }, []);

  return (
    <InviteToServerContext.Provider value={{ isOpen, targetUserId, openInviteToServer, close }}>
      {children}
    </InviteToServerContext.Provider>
  );
};
