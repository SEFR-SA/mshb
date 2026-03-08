import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { playSound } from "@/lib/soundManager";

interface AudioSettings {
  globalMuted: boolean;
  globalDeafened: boolean;
  setGlobalMuted: React.Dispatch<React.SetStateAction<boolean>>;
  setGlobalDeafened: React.Dispatch<React.SetStateAction<boolean>>;
  toggleGlobalMute: () => void;
  toggleGlobalDeafen: () => void;

  // Device lists
  micDevices: MediaDeviceInfo[];
  speakerDevices: MediaDeviceInfo[];

  // Active device IDs
  micDeviceId: string;
  speakerDeviceId: string;
  setMicDeviceId: (id: string) => void;
  setSpeakerDeviceId: (id: string) => void;

  // Volume levels (0–200, default 100)
  inputVolume: number;
  outputVolume: number;
  setInputVolume: (v: number) => void;
  setOutputVolume: (v: number) => void;
}

const AudioSettingsContext = createContext<AudioSettings>({
  globalMuted: false,
  globalDeafened: false,
  setGlobalMuted: () => {},
  setGlobalDeafened: () => {},
  toggleGlobalMute: () => {},
  toggleGlobalDeafen: () => {},
  micDevices: [],
  speakerDevices: [],
  micDeviceId: "default",
  speakerDeviceId: "default",
  setMicDeviceId: () => {},
  setSpeakerDeviceId: () => {},
  inputVolume: 100,
  outputVolume: 100,
  setInputVolume: () => {},
  setOutputVolume: () => {},
});

export const useAudioSettings = () => useContext(AudioSettingsContext);

// Helpers for localStorage persistence
const loadDevicePrefs = () => {
  try {
    const stored = localStorage.getItem("mshb_device_prefs");
    if (stored) return JSON.parse(stored) as { micDeviceId?: string; speakerDeviceId?: string; cameraDeviceId?: string };
  } catch {}
  return {};
};

const loadVolumes = () => {
  try {
    const stored = localStorage.getItem("mshb_audio_volumes");
    if (stored) return JSON.parse(stored) as { inputVolume?: number; outputVolume?: number };
  } catch {}
  return {};
};

export const AudioSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [globalMuted, setGlobalMuted] = useState(false);
  const [globalDeafened, setGlobalDeafened] = useState(false);

  // Device lists
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);

  // Active device IDs — initialised from localStorage
  const [micDeviceId, setMicDeviceIdState] = useState(() => loadDevicePrefs().micDeviceId ?? "default");
  const [speakerDeviceId, setSpeakerDeviceIdState] = useState(() => loadDevicePrefs().speakerDeviceId ?? "default");

  // Volume levels
  const [inputVolume, setInputVolumeState] = useState(() => loadVolumes().inputVolume ?? 100);
  const [outputVolume, setOutputVolumeState] = useState(() => loadVolumes().outputVolume ?? 100);

  // Persist device prefs
  const persistDevicePrefs = useCallback((mic: string, speaker: string) => {
    const existing = loadDevicePrefs();
    localStorage.setItem("mshb_device_prefs", JSON.stringify({ ...existing, micDeviceId: mic, speakerDeviceId: speaker }));
  }, []);

  const setMicDeviceId = useCallback((id: string) => {
    setMicDeviceIdState(id);
    setSpeakerDeviceIdState((sp) => { persistDevicePrefs(id, sp); return sp; });
  }, [persistDevicePrefs]);

  const setSpeakerDeviceId = useCallback((id: string) => {
    setSpeakerDeviceIdState(id);
    setMicDeviceIdState((mic) => { persistDevicePrefs(mic, id); return mic; });
  }, [persistDevicePrefs]);

  // Persist volumes
  const setInputVolume = useCallback((v: number) => {
    setInputVolumeState(v);
    setOutputVolumeState((ov) => {
      localStorage.setItem("mshb_audio_volumes", JSON.stringify({ inputVolume: v, outputVolume: ov }));
      return ov;
    });
  }, []);

  const setOutputVolume = useCallback((v: number) => {
    setOutputVolumeState(v);
    setInputVolumeState((iv) => {
      localStorage.setItem("mshb_audio_volumes", JSON.stringify({ inputVolume: iv, outputVolume: v }));
      return iv;
    });
  }, []);

  // Enumerate devices on mount
  useEffect(() => {
    const enumerate = () => {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        setMicDevices(devices.filter((d) => d.kind === "audioinput"));
        setSpeakerDevices(devices.filter((d) => d.kind === "audiooutput"));
      }).catch(() => {});
    };
    enumerate();
    navigator.mediaDevices?.addEventListener?.("devicechange", enumerate);
    return () => { navigator.mediaDevices?.removeEventListener?.("devicechange", enumerate); };
  }, []);

  const toggleGlobalMute = useCallback(() => {
    setGlobalMuted((prev) => {
      playSound(prev ? "unmute" : "mute");
      if (prev) setGlobalDeafened(false);
      return !prev;
    });
  }, []);

  const toggleGlobalDeafen = useCallback(() => {
    setGlobalDeafened((prev) => {
      const next = !prev;
      playSound(prev ? "undeafen" : "deafen");
      if (next) setGlobalMuted(true);
      else setGlobalMuted(false);
      return next;
    });
  }, []);

  return (
    <AudioSettingsContext.Provider
      value={{
        globalMuted, globalDeafened, setGlobalMuted, setGlobalDeafened,
        toggleGlobalMute, toggleGlobalDeafen,
        micDevices, speakerDevices,
        micDeviceId, speakerDeviceId, setMicDeviceId, setSpeakerDeviceId,
        inputVolume, outputVolume, setInputVolume, setOutputVolume,
      }}
    >
      {children}
    </AudioSettingsContext.Provider>
  );
};
