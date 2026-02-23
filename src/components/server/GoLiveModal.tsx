import React, { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Monitor, AppWindow, MonitorPlay } from "lucide-react";

export interface GoLiveSettings {
  resolution: "720p" | "1080p" | "source";
  fps: 30 | 60;
  stream: MediaStream;
}

interface GoLiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGoLive: (settings: GoLiveSettings) => void;
}

const GoLiveModal = ({ open, onOpenChange, onGoLive }: GoLiveModalProps) => {
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);
  const [resolution, setResolution] = useState<"720p" | "1080p" | "source">("1080p");
  const [fps, setFps] = useState<"30" | "60">("30");
  const videoRef = useRef<HTMLVideoElement>(null);

  // Attach preview stream to video element
  useEffect(() => {
    if (videoRef.current && previewStream) {
      videoRef.current.srcObject = previewStream;
    }
  }, [previewStream]);

  // Cleanup preview stream when modal closes
  useEffect(() => {
    if (!open && previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
    }
  }, [open]);

  const selectSource = useCallback(async () => {
    // Stop any existing preview first
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" } as any,
        audio: { echoCancellation: true } as any,
      });
      setPreviewStream(stream);
      // If user stops sharing via browser UI, clear preview
      stream.getVideoTracks()[0].onended = () => {
        setPreviewStream(null);
      };
    } catch {
      // User cancelled the picker
    }
  }, [previewStream]);

  const handleGoLive = () => {
    if (!previewStream) return;
    onGoLive({
      resolution,
      fps: parseInt(fps) as 30 | 60,
      stream: previewStream,
    });
    // Don't stop stream — caller owns it now
    setPreviewStream(null);
    onOpenChange(false);
  };

  const handleCancel = () => {
    if (previewStream) {
      previewStream.getTracks().forEach((t) => t.stop());
      setPreviewStream(null);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel(); else onOpenChange(o); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-lg">Share your screen</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Select a source and configure your stream settings
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 pb-4 space-y-4">
          {/* Source selection tabs */}
          <Tabs defaultValue="screens" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="screens" className="flex-1 gap-1.5" onClick={selectSource}>
                <Monitor className="h-4 w-4" />
                Screens
              </TabsTrigger>
              <TabsTrigger value="applications" className="flex-1 gap-1.5" onClick={selectSource}>
                <AppWindow className="h-4 w-4" />
                Applications
              </TabsTrigger>
            </TabsList>

            <TabsContent value="screens" className="mt-3">
              <SourcePreview
                previewStream={previewStream}
                videoRef={videoRef}
                onSelect={selectSource}
              />
            </TabsContent>
            <TabsContent value="applications" className="mt-3">
              <SourcePreview
                previewStream={previewStream}
                videoRef={videoRef}
                onSelect={selectSource}
              />
            </TabsContent>
          </Tabs>

          {/* Stream settings */}
          <div className="grid grid-cols-2 gap-4">
            {/* Resolution */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resolution</p>
              <ToggleGroup
                type="single"
                value={resolution}
                onValueChange={(v) => v && setResolution(v as any)}
                className="w-full"
              >
                <ToggleGroupItem value="720p" className="flex-1 text-xs">720p</ToggleGroupItem>
                <ToggleGroupItem value="1080p" className="flex-1 text-xs">1080p</ToggleGroupItem>
                <ToggleGroupItem value="source" className="flex-1 text-xs">Source</ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Frame Rate */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Frame Rate</p>
              <ToggleGroup
                type="single"
                value={fps}
                onValueChange={(v) => v && setFps(v as any)}
                className="w-full"
              >
                <ToggleGroupItem value="30" className="flex-1 text-xs">30 FPS</ToggleGroupItem>
                <ToggleGroupItem value="60" className="flex-1 text-xs">60 FPS</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/30">
          <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
          <Button
            onClick={handleGoLive}
            disabled={!previewStream}
            className="bg-primary hover:bg-primary/90 gap-1.5"
          >
            <MonitorPlay className="h-4 w-4" />
            Go Live
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SourcePreview = ({
  previewStream,
  videoRef,
  onSelect,
}: {
  previewStream: MediaStream | null;
  videoRef: React.RefObject<HTMLVideoElement>;
  onSelect: () => void;
}) => {
  if (!previewStream) {
    return (
      <button
        onClick={onSelect}
        className="w-full aspect-video rounded-lg border-2 border-dashed border-border bg-muted/50 flex flex-col items-center justify-center gap-2 hover:bg-muted/80 transition-colors cursor-pointer"
      >
        <Monitor className="h-8 w-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Click to select a source</span>
      </button>
    );
  }

  return (
    <div className="w-full aspect-video rounded-lg overflow-hidden bg-black border border-border relative group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-contain"
      />
      <button
        onClick={onSelect}
        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      >
        <span className="text-sm text-white font-medium">Change source</span>
      </button>
    </div>
  );
};

export default GoLiveModal;
