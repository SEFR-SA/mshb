import React from "react";
import { cn } from "@/lib/utils";

interface AvatarDecorationWrapperProps {
  decorationUrl?: string | null;
  isPro?: boolean;
  size?: number;
  className?: string;
  children: React.ReactNode;
}

const AvatarDecorationWrapper = ({
  decorationUrl,
  isPro,
  size = 32,
  className,
  children,
}: AvatarDecorationWrapperProps) => {
  const showDecoration = !!decorationUrl && !!isPro;

  if (!showDecoration) {
    return <div className={cn("relative inline-block", className)}>{children}</div>;
  }

  // Decoration is ~25% larger than the avatar to frame it
  const decorationSize = Math.round(size * 1.2);
  const offset = Math.round((decorationSize - size) / 2);

  return (
    <div
      className={cn("relative inline-block", className)}
      style={{ width: size, height: size }}
    >
      {children}
      <img
        src={decorationUrl}
        alt=""
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 max-w-none"
        style={{ width: decorationSize, height: decorationSize }}
      />
    </div>
  );
};

export default AvatarDecorationWrapper;
