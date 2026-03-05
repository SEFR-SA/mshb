import React, { createContext, useContext, useState, useCallback } from "react";

interface ReportModalContextValue {
  isOpen: boolean;
  reportMessageId: string | null;
  reportSenderName: string | null;
  openReportModal: (messageId: string, senderName: string) => void;
  closeReportModal: () => void;
}

const ReportModalContext = createContext<ReportModalContextValue>({
  isOpen: false,
  reportMessageId: null,
  reportSenderName: null,
  openReportModal: () => {},
  closeReportModal: () => {},
});

export const useReportModal = () => useContext(ReportModalContext);

export const ReportModalProvider = ({ children }: { children: React.ReactNode }) => {
  const [reportMessageId, setReportMessageId] = useState<string | null>(null);
  const [reportSenderName, setReportSenderName] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const openReportModal = useCallback((messageId: string, senderName: string) => {
    setReportMessageId(messageId);
    setReportSenderName(senderName);
    setIsOpen(true);
  }, []);

  const closeReportModal = useCallback(() => {
    setIsOpen(false);
    setReportMessageId(null);
    setReportSenderName(null);
  }, []);

  return (
    <ReportModalContext.Provider value={{ isOpen, reportMessageId, reportSenderName, openReportModal, closeReportModal }}>
      {children}
    </ReportModalContext.Provider>
  );
};
