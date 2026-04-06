import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useGameOverlaySettings, type GameOverlaySettings } from "@/hooks/useGameOverlaySettings";
import { UnsavedChangesBar } from "@/components/settings/UnsavedChangesBar";
import { cn } from "@/lib/utils";

interface GameOverlayTabProps {
  setUnsaved?: (onSave: () => void, onReset: () => void) => void;
  clearUnsaved?: () => void;
}

const POSITION_QUADRANTS = [
  { value: "TOP_LEFT",     label: "topLeft",     corner: "top-2 start-2" },
  { value: "TOP_RIGHT",    label: "topRight",    corner: "top-2 end-2" },
  { value: "BOTTOM_LEFT",  label: "bottomLeft",  corner: "bottom-2 start-2" },
  { value: "BOTTOM_RIGHT", label: "bottomRight", corner: "bottom-2 end-2" },
] as const;

const GameOverlayTab = ({ setUnsaved, clearUnsaved }: GameOverlayTabProps) => {
  const { t } = useTranslation();
  const { settings, update, save } = useGameOverlaySettings();

  /* ── Local draft state ── */
  const [draft, setDraft] = useState<GameOverlaySettings>(settings);
  const hasChanges = JSON.stringify(draft) !== JSON.stringify(settings);
  const pendingSave = useRef(false);

  // Safety-net: sync draft if upstream settings change (e.g. after an external reload)
  useEffect(() => { setDraft(settings); }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  // After update(draft) causes a re-render, settings equals draft — safe to call save()
  useEffect(() => {
    if (pendingSave.current) { save(); pendingSave.current = false; }
  }, [settings]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = () => { pendingSave.current = true; update(draft); };
  const handleReset = () => setDraft(settings);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t("gameOverlay.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("gameOverlay.description")}</p>
      </div>

      {/* Enable Toggle */}
      <div className="rounded-xl border border-border/50 bg-muted/10 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="overlay-enable" className="text-sm font-medium cursor-pointer">
              {t("gameOverlay.enable")}
            </Label>
            <p className="text-xs text-muted-foreground">{t("gameOverlay.enableDescription")}</p>
          </div>
          <Switch
            id="overlay-enable"
            checked={draft.enabled}
            onCheckedChange={(v) => setDraft(prev => ({ ...prev, enabled: v }))}
          />
        </div>
      </div>

      {/* Visual Settings — only when enabled */}
      {draft.enabled && (
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-1 divide-y divide-border/30">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground pb-3">
            {t("gameOverlay.visualSettings")}
          </h3>

          {/* Avatar Size */}
          <div className="pt-3 pb-2 space-y-2">
            <p className="text-sm font-medium">{t("gameOverlay.avatarSize")}</p>
            <RadioGroup
              value={draft.avatarSize}
              onValueChange={(v) => setDraft(prev => ({ ...prev, avatarSize: v as "LARGE" | "SMALL" }))}
              className="flex gap-6"
            >
              {(["LARGE", "SMALL"] as const).map((val) => (
                <div key={val} className="flex items-center gap-2">
                  <RadioGroupItem value={val} id={`avatar-${val}`} />
                  <Label htmlFor={`avatar-${val}`} className="text-sm cursor-pointer">
                    {t(`gameOverlay.avatar${val === "LARGE" ? "Large" : "Small"}`)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Display Names */}
          <div className="pt-3 pb-2 space-y-2">
            <p className="text-sm font-medium">{t("gameOverlay.displayNames")}</p>
            <RadioGroup
              value={draft.displayNames}
              onValueChange={(v) => setDraft(prev => ({ ...prev, displayNames: v as "ALWAYS" | "ONLY_SPEAKING" | "NEVER" }))}
              className="flex flex-wrap gap-x-6 gap-y-2"
            >
              {([
                { value: "ALWAYS", key: "namesAlways" },
                { value: "ONLY_SPEAKING", key: "namesOnlySpeaking" },
                { value: "NEVER", key: "namesNever" },
              ] as const).map(({ value, key }) => (
                <div key={value} className="flex items-center gap-2">
                  <RadioGroupItem value={value} id={`names-${value}`} />
                  <Label htmlFor={`names-${value}`} className="text-sm cursor-pointer">
                    {t(`gameOverlay.${key}`)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Display Users */}
          <div className="pt-3 pb-1 space-y-2">
            <p className="text-sm font-medium">{t("gameOverlay.displayUsers")}</p>
            <RadioGroup
              value={draft.displayUsers}
              onValueChange={(v) => setDraft(prev => ({ ...prev, displayUsers: v as "ALWAYS" | "ONLY_SPEAKING" }))}
              className="flex gap-6"
            >
              {([
                { value: "ALWAYS", key: "usersAlways" },
                { value: "ONLY_SPEAKING", key: "usersOnlySpeaking" },
              ] as const).map(({ value, key }) => (
                <div key={value} className="flex items-center gap-2">
                  <RadioGroupItem value={value} id={`users-${value}`} />
                  <Label htmlFor={`users-${value}`} className="text-sm cursor-pointer">
                    {t(`gameOverlay.${key}`)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      )}

      {/* Notification Position — only when enabled */}
      {draft.enabled && (
        <div className="rounded-xl border border-border/50 bg-muted/10 p-4 space-y-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            {t("gameOverlay.notificationPosition")}
          </h3>

          {/* Monitor widget */}
          <div className="max-w-sm mx-auto">
            {/* Screen */}
            <div className="rounded-xl border-2 border-border bg-background overflow-hidden aspect-video relative">
              <div className="grid grid-cols-2 grid-rows-2 h-full">
                {POSITION_QUADRANTS.map(({ value, label, corner }) => {
                  const isSelected = draft.notificationPosition === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDraft(prev => ({ ...prev, notificationPosition: value }))}
                      className={cn(
                        "relative transition-colors border",
                        isSelected
                          ? "bg-primary/20 border-primary/50"
                          : "border-transparent hover:bg-muted/40",
                      )}
                      aria-label={t(`gameOverlay.${label}`)}
                      title={t(`gameOverlay.${label}`)}
                    >
                      {isSelected && (
                        <span
                          className={cn(
                            "absolute w-3 h-3 rounded-sm bg-primary",
                            corner,
                          )}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Stand */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-2 bg-border rounded-b-md" />
              <div className="w-24 h-1 bg-border rounded-full mt-0.5" />
            </div>

            {/* Position label */}
            <p className="text-center text-xs text-muted-foreground mt-2">
              {t(`gameOverlay.${POSITION_QUADRANTS.find(q => q.value === draft.notificationPosition)?.label ?? "topLeft"}`)}
            </p>
          </div>
        </div>
      )}

      <UnsavedChangesBar
        show={hasChanges}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
};

export default GameOverlayTab;
