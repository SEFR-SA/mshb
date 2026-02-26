import React, { createContext, useContext, useState, useCallback, useEffect } from "react";

interface VoiceChannel {
  id: string;
  name: string;
  serverId: string;
}

interface VoiceChannelContextType {
  voiceChannel: VoiceChannel | null;
  setVoiceChannel: (channel: VoiceChannel | null) => void;
  disconnectVoice: () => void;
  isScreenSharing: boolean;
  setIsScreenSharing: (v: boolean) => void;
  remoteScreenStream: MediaStream | null;
  setRemoteScreenStream: (s: MediaStream | null) => void;
  screenSharerName: string | null;
  setScreenSharerName: (n: string | null) => void;
  isWatchingStream: boolean;
  setIsWatchingStream: (v: boolean) => void;
  isCameraOn: boolean;
  setIsCameraOn: (v: boolean) => void;
  localCameraStream: MediaStream | null;
  setLocalCameraStream: (s: MediaStream | null) => void;
  remoteCameraStream: MediaStream | null;
  setRemoteCameraStream: (s: MediaStream | null) => void;
  userVolumes: Record<string, number>;
  setUserVolume: (userId: string, volume: number) => void;
}

const VoiceChannelContext = createContext<VoiceChannelContextType>({
  voiceChannel: null,
  setVoiceChannel: () => {},
  disconnectVoice: () => {},
  isScreenSharing: false,
  setIsScreenSharing: () => {},
  remoteScreenStream: null,
  setRemoteScreenStream: () => {},
  screenSharerName: null,
  setScreenSharerName: () => {},
  isWatchingStream: false,
  setIsWatchingStream: () => {},
  isCameraOn: false,
  setIsCameraOn: () => {},
  localCameraStream: null,
  setLocalCameraStream: () => {},
  remoteCameraStream: null,
  setRemoteCameraStream: () => {},
  userVolumes: {},
  setUserVolume: () => {},
});

export const useVoiceChannel = () => useContext(VoiceChannelContext);

export const VoiceChannelProvider = ({ children }: { children: React.ReactNode }) => {
  const [voiceChannel, setVoiceChannel] = useState<VoiceChannel | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);
  const [screenSharerName, setScreenSharerName] = useState<string | null>(null);
  const [isWatchingStream, setIsWatchingStream] = useState(false);

  // Auto-reset watching state when the remote stream disappears
  useEffect(() => {
    if (!remoteScreenStream) setIsWatchingStream(false);
  }, [remoteScreenStream]);

  const [isCameraOn, setIsCameraOn] = useState(false);
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null);
  const [remoteCameraStream, setRemoteCameraStream] = useState<MediaStream | null>(null);
  const [userVolumes, setUserVolumes] = useState<Record<string, number>>({});

  const setUserVolume = useCallback((userId: string, volume: number) => {
    setUserVolumes((prev) => ({ ...prev, [userId]: volume }));
  }, []);

  const disconnectVoice = useCallback(() => {
    setVoiceChannel(null);
    setIsScreenSharing(false);
    setRemoteScreenStream(null);
    setScreenSharerName(null);
    setIsWatchingStream(false);
    setIsCameraOn(false);
    setLocalCameraStream(null);
    setRemoteCameraStream(null);
    setUserVolumes({});
  }, []);

  return (
    <VoiceChannelContext.Provider value={{ voiceChannel, setVoiceChannel, disconnectVoice, isScreenSharing, setIsScreenSharing, remoteScreenStream, setRemoteScreenStream, screenSharerName, setScreenSharerName, isWatchingStream, setIsWatchingStream, isCameraOn, setIsCameraOn, localCameraStream, setLocalCameraStream, remoteCameraStream, setRemoteCameraStream, userVolumes, setUserVolume }}>
      {children}
    </VoiceChannelContext.Provider>
  );
};
