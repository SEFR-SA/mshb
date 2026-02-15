import React from "react";

interface StyledDisplayNameProps {
  displayName: string;
  gradientStart?: string | null;
  gradientEnd?: string | null;
  className?: string;
}

const StyledDisplayName: React.FC<StyledDisplayNameProps> = ({
  displayName,
  gradientStart,
  gradientEnd,
  className = "",
}) => {
  if (gradientStart && gradientEnd) {
    return (
      <span
        className={className}
        style={{
          background: `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {displayName}
      </span>
    );
  }

  return <span className={className}>{displayName}</span>;
};

export default StyledDisplayName;
