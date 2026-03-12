import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Monitor, AppWindow, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getBoostPerks } from "@/config/boostPerks";
import { cn } from "@/lib/utils";

export type StreamResolution = "720p" | "1080p" | "1440p" | "source";

export interface GoLiveSettings {
  resolution: StreamResolution;
  fps: 30 | 60;
  surface: "monitor" | "window";
  sourceId?: string;
}

interface DesktopSource {
  id: string;
  name: string;
  thumbnail: string;
  displayId: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoLive: (settings: GoLiveSettings) => void;
  /** Server boost level (0-3). Omit or 0 for DM calls. */
  boostLevel?: number;
}

const isElectron = () => !!(window as any).electronAPI?.getDisplaySources;

const ProBadge = () => (
  <span className="ms-1 text-[9px] font-bold bg-primary text-primary-foreground px-1 py-0.5 rounded leading-none">
    PRO
  </span>
);

const BoostBadge = ({ level }: { level: number }) => (
  <span className="ms-1 text-[9px] font-bold bg-accent text-accent-foreground px-1 py-0.5 rounded leading-none">
    LV{level}+
  </span>
);

/** Check if a resolution is allowed for the user given their tier and boost level. */
function isResolutionAllowed(
  res: StreamResolution,
  isPro: boolean,
  boostLevel: number
): boolean {
  if (isPro) return true;
  const perks = getBoostPerks(boostLevel);
  const order: Record<string, number> = { "720p": 0, "1080p": 1, "1440p": 2, "4k": 3, source: 3 };
  const resRank = order[res] ?? 0;
  const maxRank = order[perks.maxScreenShareRes] ?? 1;
  return resRank <= maxRank;
}

/** Check if 60fps is allowed. */
function isFpsAllowed(isPro: boolean, boostLevel: number): boolean {
  if (isPro) return true;
  return getBoostPerks(boostLevel).maxScreenShareFps >= 60;
}

const GoLiveModal = ({ open, onOpenChange, onGoLive, boostLevel = 0 }: Props) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const isPro = (profile as any)?.is_pro ?? false;

  const [surface, setSurface] = useState<"monitor" | "window">("monitor");
  const [resolution, setResolution] = useState<StreamResolution>("1080p");
  const [fps, setFps] = useState<30 | 60>(30);
  const [sources, setSources] = useState<DesktopSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [loadingSources, setLoadingSources] = useState(false);

  // Fetch sources whenever the dialog opens (Electron only)
  useEffect(() => {
    if (!open || !isElectron()) return;
    setLoadingSources(true);
    setSelectedSourceId(null);
    (window as any).electronAPI.getDisplaySources().then((list: DesktopSource[]) => {
      setSources(list);
      setLoadingSources(false);
    }).catch(() => {
      setSources([]);
      setLoadingSources(false);
    });
  }, [open]);

  const screensources = sources.filter((s) => s.id.startsWith("screen:"));
  const windowSources = sources.filter((s) => s.id.startsWith("window:"));
  const visibleSources = surface === "monitor" ? screensources : windowSources;

  const handleGoLive = () => {
    onGoLive({ resolution, fps, surface, sourceId: selectedSourceId ?? undefined });
  };

  const canGoLive = !isElectron() || selectedSourceId !== null;

  const handleResolutionChange = (v: string) => {
    if (!v) return;
    const res = v as StreamResolution;
    if (!isResolutionAllowed(res, isPro, boostLevel)) {
      toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast") });
      return;
    }
    setResolution(res);
    // If selected resolution doesn't allow 60fps for this tier, reset to 30
    if (fps === 60 && !isFpsAllowed(isPro, boostLevel)) {
      setFps(30);
    }
  };

  const handleFpsChange = (v: string) => {
    if (!v) return;
    if (v === "60" && !isFpsAllowed(isPro, boostLevel)) {
      toast({ title: t("pro.proRequired"), description: t("pro.upgradeToast") });
      return;
    }
    setFps(Number(v) as 30 | 60);
  };

  // Derived: which options need badges
  const needs1440Badge = !isPro && boostLevel < 2;
  const needsSourceBadge = !isPro && boostLevel < 3;
  const needs60fpsBadge = !isPro && !isFpsAllowed(isPro, boostLevel);

  // Badge helper: show boost level needed or PRO
  const resolutionBadge = (res: StreamResolution) => {
    if (isPro) return null;
    if (res === "1440p" && boostLevel < 2) return boostLevel >= 1 ? <BoostBadge level={2} /> : <ProBadge />;
    if (res === "source" && boostLevel < 3) return boostLevel >= 1 ? <BoostBadge level={3} /> : <ProBadge />;
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-green-500" />
            {t("streaming.streamSettings")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Section 1: Source Selection */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("streaming.sourceSelection")}</p>
            <Tabs value={surface} onValueChange={(v) => { setSurface(v as "monitor" | "window"); setSelectedSourceId(null); }}>
              <TabsList className="w-full">
                <TabsTrigger value="monitor" className="flex-1">
                  <Monitor className="h-4 w-4 me-2" />
                  {t("streaming.screenTab")}
                </TabsTrigger>
                <TabsTrigger value="window" className="flex-1">
                  <AppWindow className="h-4 w-4 me-2" />
                  {t("streaming.windowTab")}
                </TabsTrigger>
              </TabsList>

              {["monitor", "window"].map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-3">
                  {isElectron() ? (
                    loadingSources ? (
                      <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                        {t("common.loading")}
                      </div>
                    ) : visibleSources.length === 0 ? (
                      <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                        {t("streaming.noSources")}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {visibleSources.map((src) => (
                          <button
                            key={src.id}
                            type="button"
                            onClick={() => setSelectedSourceId(src.id)}
                            className={cn(
                              "flex flex-col items-center gap-1.5 rounded-lg border-2 p-1.5 text-start transition-colors",
                              selectedSourceId === src.id
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                            )}
                          >
                            <img
                              src={src.thumbnail}
                              alt={src.name}
                              className="w-full rounded object-cover"
                              style={{ aspectRatio: "16/9" }}
                            />
                            <span className="text-xs text-muted-foreground truncate w-full px-0.5">
                              {src.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    )
                  ) : (
                    <p className="text-xs text-muted-foreground">{t("streaming.sourceTabDesc")}</p>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </div>

          {/* Section 2: Resolution */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("streaming.resolution")}</p>
            <ToggleGroup
              type="single"
              value={resolution}
              onValueChange={handleResolutionChange}
              className="w-full"
            >
              <ToggleGroupItem value="720p" className="flex-1 text-xs">720p</ToggleGroupItem>
              <ToggleGroupItem value="1080p" className="flex-1 text-xs">1080p</ToggleGroupItem>
              <ToggleGroupItem
                value="1440p"
                className={cn("flex-1 text-xs", needs1440Badge && "opacity-60")}
              >
                1440p{resolutionBadge("1440p")}
              </ToggleGroupItem>
              <ToggleGroupItem
                value="source"
                className={cn("flex-1 text-xs", needsSourceBadge && "opacity-60")}
              >
                {t("streaming.sourceRes")}{resolutionBadge("source")}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Section 3: Frame Rate */}
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("streaming.frameRate")}</p>
            <ToggleGroup
              type="single"
              value={String(fps)}
              onValueChange={handleFpsChange}
              className="w-full"
            >
              <ToggleGroupItem value="30" className="flex-1 text-xs">{t("streaming.fps30")}</ToggleGroupItem>
              <ToggleGroupItem
                value="60"
                className={cn("flex-1 text-xs", needs60fpsBadge && "opacity-60")}
              >
                {t("streaming.fps60")}{needs60fpsBadge && <ProBadge />}
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleGoLive}
              disabled={!canGoLive}
              className="bg-green-600 hover:bg-green-500 text-white gap-2 disabled:opacity-50"
            >
              <Radio className="h-4 w-4" />
              {t("streaming.goLive")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GoLiveModal;
