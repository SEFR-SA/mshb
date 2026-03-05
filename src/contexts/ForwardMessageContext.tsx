import React, { createContext, useContext, useState, useCallback } from "react";

interface ForwardMessagePayload {
  content: string;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
}

interface ForwardMessageContextValue {
  isOpen: boolean;
  payload: ForwardMessagePayload | null;
  openForwardModal: (payload: ForwardMessagePayload) => void;
  closeForwardModal: () => void;
}

const ForwardMessageContext = createContext<ForwardMessageContextValue>({
  isOpen: false,
  payload: null,
  openForwardModal: () => {},
  closeForwardModal: () => {},
});

export const useForwardMessage = () => useContext(ForwardMessageContext);

export const ForwardMessageProvider = ({ children }: { children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [payload, setPayload] = useState<ForwardMessagePayload | null>(null);

  const openForwardModal = useCallback((p: ForwardMessagePayload) => {
    setPayload(p);
    setIsOpen(true);
  }, []);

  const closeForwardModal = useCallback(() => {
    setIsOpen(false);
    setPayload(null);
  }, []);

  return (
    <ForwardMessageContext.Provider value={{ isOpen, payload, openForwardModal, closeForwardModal }}>
      {children}
    </ForwardMessageContext.Provider>
  );
};
