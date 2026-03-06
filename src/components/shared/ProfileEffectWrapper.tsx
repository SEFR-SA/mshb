import React from "react";
import { cn } from "@/lib/utils";

interface ProfileEffectWrapperProps {
  effectUrl?: string | null;
  isPro?: boolean;
  className?: string;
  children: React.ReactNode;
}

const ProfileEffectWrapper = ({ effectUrl, isPro, className, children }: ProfileEffectWrapperProps) => {
  const showEffect = !!effectUrl && !!isPro;

  if (!showEffect) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {children}
      <img
        src={effectUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-50"
      />
    </div>
  );
};

export default ProfileEffectWrapper;
