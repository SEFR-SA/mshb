import React from "react";
import { cn } from "@/lib/utils";

interface NameplateWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  nameplateUrl?: string | null;
  isPro?: boolean;
  imageClassName?: string;
  fadeOnHover?: boolean;
  isActive?: boolean;
}

const NameplateWrapper = React.forwardRef<HTMLDivElement, NameplateWrapperProps>(
  ({ nameplateUrl, isPro, className, imageClassName, fadeOnHover, isActive, children, ...rest }, ref) => {
    const showNameplate = !!nameplateUrl && !!isPro;

    if (!showNameplate) {
      return <div ref={ref} className={className} {...rest}>{children}</div>;
    }

    const imgOpacity = fadeOnHover
      ? (isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100")
      : "";

    return (
      // overflow-hidden is intentionally NOT on this outer div — it would clip text-shadow glows
      // from StyledDisplayName children (Neon/Toon/Pop effects). Instead the image is wrapped in
      // its own clip container so it still gets clipped to the rounded corners independently.
      <div ref={ref} className={cn("relative rounded-md", fadeOnHover && "group", className)} {...rest}>
        <div className="absolute inset-0 rounded-[inherit] overflow-hidden pointer-events-none z-0">
          <img
            src={nameplateUrl}
            alt=""
            className={cn(
              imageClassName ?? "w-full h-full object-cover",
              fadeOnHover && "transition-opacity duration-200",
              imgOpacity
            )}
          />
        </div>
        <div className="relative z-10 h-full">{children}</div>
      </div>
    );
  }
);

NameplateWrapper.displayName = "NameplateWrapper";

export default NameplateWrapper;
