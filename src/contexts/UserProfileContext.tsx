import React, { createContext, useContext, useState, useCallback } from "react";

interface UserProfileContextValue {
  profileUserId: string | null;
  openProfile: (userId: string) => void;
  closeProfile: () => void;
}

const UserProfileContext = createContext<UserProfileContextValue>({
  profileUserId: null,
  openProfile: () => {},
  closeProfile: () => {},
});

export const useUserProfile = () => useContext(UserProfileContext);

export const UserProfileProvider = ({ children }: { children: React.ReactNode }) => {
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const openProfile = useCallback((userId: string) => setProfileUserId(userId), []);
  const closeProfile = useCallback(() => setProfileUserId(null), []);

  return (
    <UserProfileContext.Provider value={{ profileUserId, openProfile, closeProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};
