import React from "react";
import { cn } from "@/lib/utils";

interface NameplateWrapperProps {
  nameplateUrl?: string | null;
  isPro?: boolean;
  className?: string;
  children: React.ReactNode;
}

const NameplateWrapper = ({ nameplateUrl, isPro, className, children }: NameplateWrapperProps) => {
  const showNameplate = !!nameplateUrl && !!isPro;

  if (!showNameplate) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn("relative overflow-hidden rounded-md", className)}>
      <img
        src={nameplateUrl}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-black/30 z-[1] pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default NameplateWrapper;
