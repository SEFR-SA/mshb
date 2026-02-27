import React from "react";

interface StyledDisplayNameProps {
  displayName: string;
  gradientStart?: string | null;
  gradientEnd?: string | null;
  color?: string | null;
  className?: string;
  serverTag?: {
    name: string;
    badge: string | null;
    color: string | null;
  } | null;
}

const StyledDisplayName: React.FC<StyledDisplayNameProps> = ({
  displayName,
  gradientStart,
  gradientEnd,
  color,
  className = "",
  serverTag,
}) => {
  const tagEl = serverTag ? (
    <span
      className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full text-white ml-1.5 inline-flex items-center gap-1 align-middle whitespace-nowrap"
      style={{ backgroundColor: serverTag.color || "#6b7280" }}
    >
      {serverTag.badge && <span>{serverTag.badge}</span>}
      <span>{serverTag.name}</span>
    </span>
  ) : null;

  if (gradientStart && gradientEnd) {
    return (
      <span className={className}>
        <span
          style={{
            display: "inline-block",
            padding: "2px 0",
            backgroundImage: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: 1.4,
            fontFamily: "inherit, 'Inter', system-ui, sans-serif",
          }}
        >
          {displayName}
        </span>
        {tagEl}
      </span>
    );
  }

  if (color) {
    return (
      <span className={className}>
        <span style={{ color }}>{displayName}</span>
        {tagEl}
      </span>
    );
  }

  return (
    <span className={className}>
      {displayName}
      {tagEl}
    </span>
  );
};

export default StyledDisplayName;
