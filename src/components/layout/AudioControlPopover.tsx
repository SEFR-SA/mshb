import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAudioSettings } from "@/contexts/AudioSettingsContext";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

interface AudioControlPopoverProps {
  type: "input" | "output";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const AudioControlPopover = ({ type, open, onOpenChange, children }: AudioControlPopoverProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    micDevices, speakerDevices,
    micDeviceId, speakerDeviceId,
    setMicDeviceId, setSpeakerDeviceId,
    inputVolume, outputVolume,
    setInputVolume, setOutputVolume,
  } = useAudioSettings();

  const isInput = type === "input";
  const devices = isInput ? micDevices : speakerDevices;
  const activeId = isInput ? micDeviceId : speakerDeviceId;
  const setDevice = isInput ? setMicDeviceId : setSpeakerDeviceId;
  const volume = isInput ? inputVolume : outputVolume;
  const setVolume = isInput ? setInputVolume : setOutputVolume;

  const deviceLabel = (d: MediaDeviceInfo) => d.label || `${d.kind} (${d.deviceId.slice(0, 8)})`;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent side="top" align="center" sideOffset={8} className="w-72 p-0">
        <div className="p-3 space-y-3">
          {/* Device selection */}
          <div>
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
              {isInput ? t("settings.microphone") : t("settings.speakers")}
            </Label>
            <RadioGroup
              value={activeId}
              onValueChange={setDevice}
              className="space-y-1 max-h-36 overflow-y-auto"
            >
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm">
                <RadioGroupItem value="default" />
                <span className="truncate">Default</span>
              </label>
              {devices.map((d) => (
                <label
                  key={d.deviceId}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer text-sm"
                >
                  <RadioGroupItem value={d.deviceId} />
                  <span className="truncate">{deviceLabel(d)}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Volume slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">
                {isInput ? t("settings.inputVolume") : t("settings.outputVolume")}
              </Label>
              <span className="text-xs tabular-nums text-muted-foreground">{volume}%</span>
            </div>
            <Slider
              value={[volume]}
              onValueChange={([v]) => setVolume(v)}
              min={0}
              max={200}
              step={1}
            />
          </div>
        </div>

        <Separator />

        {/* Voice Settings shortcut */}
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-xs"
            onClick={() => {
              onOpenChange(false);
              navigate("/settings");
              // Allow settings page to mount, then switch to voice tab
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent("settings-navigate-tab", { detail: "voice" }));
              }, 100);
            }}
          >
            <Settings className="h-3.5 w-3.5" />
            {t("settings.voiceVideo")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default AudioControlPopover;
