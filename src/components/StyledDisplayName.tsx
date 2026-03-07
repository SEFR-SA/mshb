import React from "react";
import ServerTagBadgeIcon from "./ServerTagBadgeIcon";
import { FONT_STYLES } from "@/config/nameStyles";
import { cn } from "@/lib/utils";

interface StyledDisplayNameProps {
  displayName: string;
  fontStyle?: string | null;
  effect?: string | null;
  gradientStart?: string | null;
  gradientEnd?: string | null;
  color?: string | null;
  className?: string;
  serverTag?: {
    name: string;
    badge: string | null;
    color: string | null;
    badgeColor?: string | null;
  } | null;
}

const StyledDisplayName: React.FC<StyledDisplayNameProps> = ({
  displayName,
  fontStyle,
  effect,
  gradientStart,
  gradientEnd,
  color,
  className = "",
  serverTag,
}) => {
  const tagEl = serverTag ? (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ml-1.5 text-white align-middle whitespace-nowrap"
      style={{ backgroundColor: serverTag.color || "#6b7280" }}
    >
      <ServerTagBadgeIcon badgeName={serverTag.badge} color={serverTag.badgeColor ?? serverTag.color ?? undefined} className="h-4 w-4" />
      {serverTag.name ? serverTag.name.substring(0, 4).toUpperCase() : ""}
    </span>
  ) : null;

  const fontDef = fontStyle ? FONT_STYLES.find(f => f.id === fontStyle) : null;
  const fontFamily = fontDef && fontDef.id !== "Normal" ? fontDef.family : undefined;
  const rendered = displayName;

  const activeColor = color || gradientStart || "#FFFFFF";

  const neonShadow = `0 0 2px #fff, 0 0 8px ${activeColor}, 0 0 16px ${activeColor}, 0 0 30px ${activeColor}`;
  const toonShadow = `-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000`;
  const popShadow  = `2px 2px 0 rgba(0,0,0,0.4), 4px 4px 0 rgba(0,0,0,0.15)`;

  // Shared bleed style: expands the paint area with padding then pulls it back with
  // negative margins so text stays flush. Prevents parent overflow:hidden from clipping shadows.
  const bleedStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "0.2em 0.4em",
    margin: "-0.2em -0.4em",
    position: "relative",
    zIndex: 10,
  };

  if (effect === "Neon") {
    return (
      <span className={cn("font-semibold", className)} style={{ fontFamily }}>
        <span style={{ ...bleedStyle, color: activeColor, textShadow: neonShadow }}>{rendered}</span>
        {tagEl}
      </span>
    );
  }

  if (effect === "Toon") {
    return (
      <span className={cn("font-semibold", className)} style={{ fontFamily }}>
        <span style={{ ...bleedStyle, color: activeColor, textShadow: toonShadow }}>{rendered}</span>
        {tagEl}
      </span>
    );
  }

  if (effect === "Pop") {
    return (
      <span className={cn("font-semibold", className)} style={{ fontFamily }}>
        <span style={{ ...bleedStyle, color: activeColor, textShadow: popShadow }}>{rendered}</span>
        {tagEl}
      </span>
    );
  }

  if ((effect === "Gradient" || (!effect && gradientStart && gradientEnd)) && gradientStart && gradientEnd) {
    return (
      <span className={cn("font-semibold", className)} style={{ fontFamily }}>
        <span
          style={{
            display: "inline-block",
            padding: "2px 0",
            backgroundImage: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.4,
          }}
        >
          {rendered}
        </span>
        {tagEl}
      </span>
    );
  }

  if (color || (effect === "Solid" && gradientStart)) {
    return (
      <span className={cn("font-semibold", className)} style={{ fontFamily }}>
        <span style={{ color: color || gradientStart || undefined }}>{rendered}</span>
        {tagEl}
      </span>
    );
  }

  return (
    <span className={cn("font-semibold", className)} style={{ fontFamily }}>
      {rendered}
      {tagEl}
    </span>
  );
};

export default StyledDisplayName;
