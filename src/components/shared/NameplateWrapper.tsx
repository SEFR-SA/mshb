import React from "react";
import { cn } from "@/lib/utils";

interface NameplateWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  nameplateUrl?: string | null;
  isPro?: boolean;
}

const NameplateWrapper = React.forwardRef<HTMLDivElement, NameplateWrapperProps>(
  ({ nameplateUrl, isPro, className, children, ...rest }, ref) => {
    const showNameplate = !!nameplateUrl && !!isPro;

    if (!showNameplate) {
      return <div ref={ref} className={className} {...rest}>{children}</div>;
    }

    return (
      <div ref={ref} className={cn("relative overflow-hidden rounded-md", className)} {...rest}>
        <img
          src={nameplateUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        />
        <div className="relative z-10">{children}</div>
      </div>
    );
  }
);

NameplateWrapper.displayName = "NameplateWrapper";

export default NameplateWrapper;
