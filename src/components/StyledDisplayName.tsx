import React from "react";
import ServerTagBadgeIcon from "./ServerTagBadgeIcon";
import { FONT_STYLES } from "@/config/nameStyles";

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

  const neonShadow = `0 0 8px ${activeColor}, 0 0 20px ${activeColor}, 0 0 40px ${activeColor}`;
  const toonShadow = `-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000`;
  const popShadow  = `2px 2px 0 rgba(0,0,0,0.4), 4px 4px 0 rgba(0,0,0,0.15)`;

  if (effect === "Neon") {
    return (
      <span className={className} style={{ fontFamily }}>
        <span style={{ color: activeColor, textShadow: neonShadow }}>{rendered}</span>
        {tagEl}
      </span>
    );
  }

  if (effect === "Toon") {
    return (
      <span className={className} style={{ fontFamily }}>
        <span style={{ color: activeColor, textShadow: toonShadow }}>{rendered}</span>
        {tagEl}
      </span>
    );
  }

  if (effect === "Pop") {
    return (
      <span className={className} style={{ fontFamily }}>
        <span style={{ color: activeColor, textShadow: popShadow }}>{rendered}</span>
        {tagEl}
      </span>
    );
  }

  if ((effect === "Gradient" || (!effect && gradientStart && gradientEnd)) && gradientStart && gradientEnd) {
    return (
      <span className={className} style={{ fontFamily }}>
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
      <span className={className} style={{ fontFamily }}>
        <span style={{ color: color || gradientStart || undefined }}>{rendered}</span>
        {tagEl}
      </span>
    );
  }

  return (
    <span className={className} style={{ fontFamily }}>
      {rendered}
      {tagEl}
    </span>
  );
};

export default StyledDisplayName;
