import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

interface AvatarContextValue {
  isHovered: boolean;
  alwaysPlayGif: boolean;
}
const AvatarContext = React.createContext<AvatarContextValue>({ isHovered: false, alwaysPlayGif: false });

const Avatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> & { alwaysPlayGif?: boolean }
>(({ className, alwaysPlayGif = false, onMouseEnter, onMouseLeave, ...props }, ref) => {
  const [isHovered, setIsHovered] = React.useState(false);
  return (
    <AvatarContext.Provider value={{ isHovered, alwaysPlayGif }}>
      <AvatarPrimitive.Root
        ref={ref}
        className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
        onMouseEnter={(e) => { setIsHovered(true); onMouseEnter?.(e); }}
        onMouseLeave={(e) => { setIsHovered(false); onMouseLeave?.(e); }}
        {...props}
      />
    </AvatarContext.Provider>
  );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, src, ...props }, ref) => {
  const { isHovered, alwaysPlayGif } = React.useContext(AvatarContext);
  const isGif = typeof src === "string" && /\.gif(\?.*)?$/i.test(src);
  // null = still loading, "" = failed/cors (fall back to initials), data URL = captured
  const [firstFrame, setFirstFrame] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isGif || !src || alwaysPlayGif) {
      setFirstFrame(null);
      return;
    }
    let cancelled = false;
    setFirstFrame(null); // reset while new src loads
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 64;
        canvas.height = img.naturalHeight || 64;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setFirstFrame(canvas.toDataURL("image/png"));
        }
      } catch {
        // CORS tainted canvas — will show initials as fallback
        setFirstFrame("");
      }
    };
    img.onerror = () => { if (!cancelled) setFirstFrame(""); };
    img.src = src as string;
    return () => { cancelled = true; };
  }, [src, isGif, alwaysPlayGif]);

  let resolvedSrc: typeof src = src;
  if (isGif && !alwaysPlayGif) {
    // While firstFrame is null (loading), show the gif src directly so Radix
    // renders the image immediately; once we have the frame, swap to static.
    resolvedSrc = isHovered ? src : (firstFrame === null ? src : firstFrame || "");
  }

  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn("aspect-square h-full w-full", className)}
      src={resolvedSrc}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn("flex h-full w-full items-center justify-center rounded-full bg-muted", className)}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
