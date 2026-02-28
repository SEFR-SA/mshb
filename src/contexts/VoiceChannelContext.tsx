import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  nativeResolutionLabel: string | null;
  setNativeResolutionLabel: (label: string | null) => void;
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
  nativeResolutionLabel: null,
  setNativeResolutionLabel: () => {},
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
  const [nativeResolutionLabel, setNativeResolutionLabel] = useState<string | null>(null);

  const setUserVolume = useCallback((userId: string, volume: number) => {
    setUserVolumes((prev) => ({ ...prev, [userId]: volume }));
  }, []);

  // Wipe any ghost voice-channel rows from a previous crash or hard-close
  useEffect(() => {
    const cleanup = (userId: string) => {
      supabase.from("voice_channel_participants").delete().eq("user_id", userId);
    };

    // 1. Startup wipe — user already has a persisted session on app restart
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.id) cleanup(session.user.id);
    });

    // 2. Post-login wipe — session not ready yet at mount (cold start / first login)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.id) cleanup(session.user.id);
    });

    // 3. Graceful close (best-effort fire-and-forget; may not complete before unload)
    const handleBeforeUnload = () => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user?.id) cleanup(session.user.id);
      });
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
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
    setNativeResolutionLabel(null);
  }, []);

  return (
    <VoiceChannelContext.Provider value={{ voiceChannel, setVoiceChannel, disconnectVoice, isScreenSharing, setIsScreenSharing, remoteScreenStream, setRemoteScreenStream, screenSharerName, setScreenSharerName, isWatchingStream, setIsWatchingStream, isCameraOn, setIsCameraOn, localCameraStream, setLocalCameraStream, remoteCameraStream, setRemoteCameraStream, userVolumes, setUserVolume, nativeResolutionLabel, setNativeResolutionLabel }}>
      {children}
    </VoiceChannelContext.Provider>
  );
};
