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
  isScreenSharing: boolean;
  setIsScreenSharing: (v: boolean) => void;
  remoteScreenStream: MediaStream | null;
  setRemoteScreenStream: (s: MediaStream | null) => void;
  screenSharerName: string | null;
  setScreenSharerName: (n: string | null) => void;
  isCameraOn: boolean;
  setIsCameraOn: (v: boolean) => void;
  localCameraStream: MediaStream | null;
  setLocalCameraStream: (s: MediaStream | null) => void;
  remoteCameraStream: MediaStream | null;
  setRemoteCameraStream: (s: MediaStream | null) => void;
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
  isCameraOn: false,
  setIsCameraOn: () => {},
  localCameraStream: null,
  setLocalCameraStream: () => {},
  remoteCameraStream: null,
  setRemoteCameraStream: () => {},
});

export const useVoiceChannel = () => useContext(VoiceChannelContext);

export const VoiceChannelProvider = ({ children }: { children: React.ReactNode }) => {
  const [voiceChannel, setVoiceChannel] = useState<VoiceChannel | null>(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenStream, setRemoteScreenStream] = useState<MediaStream | null>(null);
  const [screenSharerName, setScreenSharerName] = useState<string | null>(null);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [localCameraStream, setLocalCameraStream] = useState<MediaStream | null>(null);
  const [remoteCameraStream, setRemoteCameraStream] = useState<MediaStream | null>(null);

  const disconnectVoice = useCallback(() => {
    setVoiceChannel(null);
    setIsScreenSharing(false);
    setRemoteScreenStream(null);
    setScreenSharerName(null);
    setIsCameraOn(false);
    setLocalCameraStream(null);
    setRemoteCameraStream(null);
  }, []);

  return (
    <VoiceChannelContext.Provider value={{ voiceChannel, setVoiceChannel, disconnectVoice, isScreenSharing, setIsScreenSharing, remoteScreenStream, setRemoteScreenStream, screenSharerName, setScreenSharerName, isCameraOn, setIsCameraOn, localCameraStream, setLocalCameraStream, remoteCameraStream, setRemoteCameraStream }}>
      {children}
    </VoiceChannelContext.Provider>
  );
};
