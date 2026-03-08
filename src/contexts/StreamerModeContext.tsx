import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface StreamerModeContextValue {
  isStreamerMode: boolean;
  toggleStreamerMode: () => void;
}

const StreamerModeContext = createContext<StreamerModeContextValue>({
  isStreamerMode: false,
  toggleStreamerMode: () => {},
});

const STORAGE_KEY = "mshb_streamer_mode";

export const StreamerModeProvider = ({ children }: { children: React.ReactNode }) => {
  const [isStreamerMode, setIsStreamerMode] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(isStreamerMode));
    } catch {}
  }, [isStreamerMode]);

  const toggleStreamerMode = useCallback(() => {
    setIsStreamerMode((prev) => !prev);
  }, []);

  return (
    <StreamerModeContext.Provider value={{ isStreamerMode, toggleStreamerMode }}>
      {children}
    </StreamerModeContext.Provider>
  );
};

export const useStreamerMode = () => useContext(StreamerModeContext);
