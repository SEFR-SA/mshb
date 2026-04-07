import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ImageIcon } from "lucide-react";

interface ImageCropEditorProps {
  imageUrl: string;
  onApply: (croppedFile: File) => void;
  onCancel: () => void;
}

const CROP_WIDTH = 448;
const CROP_HEIGHT = 128;
const OUTPUT_WIDTH = 896;
const OUTPUT_HEIGHT = 256;

const ImageCropEditor: React.FC<ImageCropEditorProps> = ({ imageUrl, onApply, onCancel }) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
  };

  // Base size: minimum dimensions to "cover" the crop area (no zoom applied)
  const getBaseSize = useCallback(() => {
    if (!naturalSize.w || !naturalSize.h) return { w: CROP_WIDTH, h: CROP_HEIGHT };
    const imgAspect = naturalSize.w / naturalSize.h;
    const cropAspect = CROP_WIDTH / CROP_HEIGHT;
    if (imgAspect > cropAspect) {
      // wider image → fit height
      return { w: CROP_HEIGHT * imgAspect, h: CROP_HEIGHT };
    } else {
      // taller image → fit width
      return { w: CROP_WIDTH, h: CROP_WIDTH / imgAspect };
    }
  }, [naturalSize]);

  const clamp = useCallback(
    (pos: { x: number; y: number }) => {
      const base = getBaseSize();
      const maxX = Math.max(0, (base.w * zoom - CROP_WIDTH) / 2);
      const maxY = Math.max(0, (base.h * zoom - CROP_HEIGHT) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, pos.x)),
        y: Math.min(maxY, Math.max(-maxY, pos.y)),
      };
    },
    [getBaseSize, zoom]
  );

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

    const base = getBaseSize();

    // Visible region in natural-image coordinates
    const visibleW = naturalSize.w / zoom;
    const visibleH = naturalSize.h / zoom;

    // But we only see a CROP_WIDTH × CROP_HEIGHT window of the base*zoom image.
    // The crop window covers (CROP_WIDTH / (base.w * zoom)) of the natural width.
    const cropNatW = (CROP_WIDTH / (base.w * zoom)) * naturalSize.w;
    const cropNatH = (CROP_HEIGHT / (base.h * zoom)) * naturalSize.h;

    // Center of the natural image, shifted by pan
    // pan is in display pixels; convert to natural coords
    const panNatX = (position.x / (base.w * zoom)) * naturalSize.w;
    const panNatY = (position.y / (base.h * zoom)) * naturalSize.h;

    const sx = (naturalSize.w - cropNatW) / 2 - panNatX;
    const sy = (naturalSize.h - cropNatH) / 2 - panNatY;

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

    ctx.drawImage(img, sx, sy, cropNatW, cropNatH, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
    if (!blob) return;

    const file = new File([blob], "event-cover.jpg", { type: "image/jpeg" });
    onApply(file);
  };

  const base = getBaseSize();

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
          src={imageUrl}
          alt="Crop preview"
          draggable={false}
          onLoad={handleImageLoad}
          className="absolute select-none pointer-events-none"
          style={{
            width: base.w,
            height: base.h,
            left: "50%",
            top: "50%",
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom})`,
            transformOrigin: "center center",
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
