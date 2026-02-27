import React from "react";

interface StyledDisplayNameProps {
  displayName: string;
  gradientStart?: string | null;
  gradientEnd?: string | null;
  color?: string | null;
  className?: string;
}

const StyledDisplayName: React.FC<StyledDisplayNameProps> = ({
  displayName,
  gradientStart,
  gradientEnd,
  color,
  className = "",
}) => {
  if (gradientStart && gradientEnd) {
    return (
      <span
        className={className}
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
    );
  }

  if (color) {
    return <span className={className} style={{ color }}>{displayName}</span>;
  }

  return <span className={className}>{displayName}</span>;
};

export default StyledDisplayName;
