import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Volume2 } from "lucide-react";

interface DevicePrefs {
  micDeviceId: string;
  speakerDeviceId: string;
  cameraDeviceId: string;
}

const DEFAULT_PREFS: DevicePrefs = { micDeviceId: "default", speakerDeviceId: "default", cameraDeviceId: "default" };

const VoiceVideoTab = () => {
  const { t } = useTranslation();
  const [micDevices, setMicDevices] = useState<MediaDeviceInfo[]>([]);
  const [speakerDevices, setSpeakerDevices] = useState<MediaDeviceInfo[]>([]);
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [prefs, setPrefs] = useState<DevicePrefs>(DEFAULT_PREFS);
  const [micLevel, setMicLevel] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mshb_device_prefs");
      if (stored) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
    } catch {}

    navigator.mediaDevices.enumerateDevices().then((devices) => {
      setMicDevices(devices.filter((d) => d.kind === "audioinput"));
      setSpeakerDevices(devices.filter((d) => d.kind === "audiooutput"));
      setCameraDevices(devices.filter((d) => d.kind === "videoinput"));
    }).catch(() => {});

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      micStreamRef.current?.getTracks().forEach((t) => t.stop());
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const updatePrefs = (patch: Partial<DevicePrefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    localStorage.setItem("mshb_device_prefs", JSON.stringify(next));
  };

  // Stop the mic monitor, close streams and audio context
  const stopMicMonitor = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current);
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    setMicLevel(0);
    setIsMonitoring(false);
  }, []);

  const startMicMonitor = useCallback(async (deviceId: string) => {
    // Always stop any existing monitor first so the old device is released
    cancelAnimationFrame(animFrameRef.current);
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    setMicLevel(0);

    try {
      const constraints: MediaStreamConstraints = {
        audio: deviceId !== "default" ? { deviceId: { exact: deviceId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      micStreamRef.current = stream;
      setIsMonitoring(true);

      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const draw = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(avg);
        animFrameRef.current = requestAnimationFrame(draw);
      };
      draw();
    } catch {
      // Selected device unavailable — leave meter at 0
      setIsMonitoring(false);
      setMicLevel(0);
    }
  }, []);

  // When user changes mic device while monitoring, restart with the new device
  const handleMicChange = (deviceId: string) => {
    updatePrefs({ micDeviceId: deviceId });
    if (isMonitoring) {
      startMicMonitor(deviceId);
    }
  };

  // Route speaker test tone to the selected output device via setSinkId
  const testSpeaker = async () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const dest = ctx.createMediaStreamDestination();

      osc.connect(gain);
      gain.connect(dest);

      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);

      const audio = new Audio();
      audio.srcObject = dest.stream;

      // Route to the selected output device if the browser supports setSinkId
      if (prefs.speakerDeviceId !== "default" && typeof (audio as any).setSinkId === "function") {
        await (audio as any).setSinkId(prefs.speakerDeviceId);
      }

      await audio.play();
    } catch {}
  };

  const deviceLabel = (d: MediaDeviceInfo) => d.label || `${d.kind} (${d.deviceId.slice(0, 8)})`;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("settings.voiceVideo")}</h2>
        <p className="text-sm text-muted-foreground">Select your input and output devices.</p>
      </div>

      <div className="space-y-5">
        {/* Microphone */}
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("settings.microphone")}</h3>
          <Select value={prefs.micDeviceId} onValueChange={handleMicChange}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t("settings.noDevices")} />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="default">Default</SelectItem>
              {micDevices.map((d) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>{deviceLabel(d)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Input volume meter */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{t("settings.inputVolume")}</Label>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-75"
                style={{ width: `${Math.min((micLevel / 128) * 100, 100)}%` }}
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm" variant="outline" className="text-xs h-7"
                onClick={() => startMicMonitor(prefs.micDeviceId)}
              >
                Test Mic
              </Button>
              <Button size="sm" variant="ghost" className="text-xs h-7" onClick={stopMicMonitor}>
                Stop
              </Button>
            </div>
          </div>
        </div>

        {/* Speakers */}
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("settings.speakers")}</h3>
          <Select value={prefs.speakerDeviceId} onValueChange={(v) => updatePrefs({ speakerDeviceId: v })}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t("settings.noDevices")} />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="default">Default</SelectItem>
              {speakerDevices.map((d) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>{deviceLabel(d)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={testSpeaker} className="h-8">
            <Volume2 className="h-3.5 w-3.5 me-1.5" /> {t("settings.testSpeaker")}
          </Button>
        </div>

        {/* Camera */}
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-3">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{t("settings.camera")}</h3>
          <Select value={prefs.cameraDeviceId} onValueChange={(v) => updatePrefs({ cameraDeviceId: v })}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder={t("settings.noDevices")} />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="default">Default</SelectItem>
              {cameraDevices.map((d) => (
                <SelectItem key={d.deviceId} value={d.deviceId}>{deviceLabel(d)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default VoiceVideoTab;
