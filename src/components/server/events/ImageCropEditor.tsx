import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ImageIcon } from "lucide-react";

interface ImageCropEditorProps {
  imageUrl: string;
  onApply: (croppedFile: File) => void;
  onCancel: () => void;
}

const CROP_WIDTH = 460;
const CROP_HEIGHT = 260; // ~16:9
const OUTPUT_WIDTH = 800;
const OUTPUT_HEIGHT = 450;

const ImageCropEditor: React.FC<ImageCropEditorProps> = ({ imageUrl, onApply, onCancel }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement | null>(null);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  };

  // Compute the displayed image size to fill crop area, then apply zoom
  const getDisplaySize = useCallback(() => {
    if (!naturalSize.w || !naturalSize.h) return { w: CROP_WIDTH, h: CROP_HEIGHT };
    const imgAspect = naturalSize.w / naturalSize.h;
    const cropAspect = CROP_WIDTH / CROP_HEIGHT;
    let w: number, h: number;
    if (imgAspect > cropAspect) {
      // image is wider — fit by height
      h = CROP_HEIGHT * zoom;
      w = h * imgAspect;
    } else {
      // image is taller — fit by width
      w = CROP_WIDTH * zoom;
      h = w / imgAspect;
    }
    return { w, h };
  }, [naturalSize, zoom]);

  // Clamp position so image covers the crop window
  const clamp = useCallback(
    (pos: { x: number; y: number }) => {
      const { w, h } = getDisplaySize();
      const maxX = Math.max(0, (w - CROP_WIDTH) / 2);
      const maxY = Math.max(0, (h - CROP_HEIGHT) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, pos.x)),
        y: Math.min(maxY, Math.max(-maxY, pos.y)),
      };
    },
    [getDisplaySize]
  );

  // Re-clamp when zoom changes
  useEffect(() => {
    setPosition((p) => clamp(p));
  }, [zoom, clamp]);

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    posStart.current = { ...position };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPosition(clamp({ x: posStart.current.x + dx, y: posStart.current.y + dy }));
  };

  const handlePointerUp = () => {
    isDragging.current = false;
  };

  const handleReset = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleApply = async () => {
    if (!naturalSize.w || !naturalSize.h) return;

    const { w: dispW, h: dispH } = getDisplaySize();

    // The crop window center in display coords
    const centerX = dispW / 2 - position.x;
    const centerY = dispH / 2 - position.y;

    // Convert display coords → natural image coords
    const scale = naturalSize.w / dispW;
    const sx = (centerX - CROP_WIDTH / 2) * scale;
    const sy = (centerY - CROP_HEIGHT / 2) * scale;
    const sw = CROP_WIDTH * scale;
    const sh = CROP_HEIGHT * scale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext("2d")!;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      if (img.complete) resolve();
    });

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) return;

    const file = new File([blob], "event-cover.jpg", { type: "image/jpeg" });
    onApply(file);
  };

  const displaySize = getDisplaySize();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Edit Image</h3>

      {/* Crop viewport */}
      <div
        className="relative mx-auto overflow-hidden rounded-lg border border-border bg-black cursor-grab active:cursor-grabbing"
        style={{ width: CROP_WIDTH, height: CROP_HEIGHT }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Crop preview"
          draggable={false}
          onLoad={handleImageLoad}
          className="absolute select-none pointer-events-none"
          style={{
            width: displaySize.w,
            height: displaySize.h,
            left: `calc(50% - ${displaySize.w / 2}px + ${position.x}px)`,
            top: `calc(50% - ${displaySize.h / 2}px + ${position.y}px)`,
          }}
        />
        {/* Corner guides */}
        <div className="absolute inset-0 pointer-events-none border-2 border-white/20 rounded-lg" />
      </div>

      {/* Zoom slider */}
      <div className="flex items-center gap-3 px-2">
        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Slider
          value={[zoom]}
          onValueChange={([v]) => setZoom(v)}
          min={1}
          max={3}
          step={0.05}
          className="flex-1"
        />
        <ImageIcon className="h-5 w-5 text-muted-foreground shrink-0" />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleReset}
          className="text-sm text-primary hover:underline"
        >
          Reset
        </button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropEditor;
