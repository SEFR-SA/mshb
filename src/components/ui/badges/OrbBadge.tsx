import React from 'react';

interface BadgeProps {
  color: string;
  className?: string;
}

export const OrbBadge = ({ color, className }: BadgeProps) => (
  <svg
    viewBox="0 0 16 16"
    className={className}
    style={{ color }}
    shapeRendering="crispEdges"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* OUTLINE */}
    <path
      d="M11 16H5V15H11V16Z M5 15H4V14H5V15Z M12 15H11V14H12V15Z M4 14H3V13H4V14Z M13 14H12V13H13V14Z M3 13H2V12H3V13Z M14 13H13V12H14V13Z M2 12H1V11H2V12Z M15 12H14V11H15V12Z M1 11H0V5H1V11Z M16 11H15V5H16V11Z M2 5H1V4H2V5Z M15 5H14V4H15V5Z M3 4H2V3H3V4Z M14 4H13V3H14V4Z M4 3H3V2H4V3Z M13 3H12V2H13V3Z M5 2H4V1H5V2Z M12 2H11V1H12V2Z M11 1H5V0H11V1Z"
      fill="#111111"
    />

    {/* BASE (Dynamic Color) */}
    <path
      d="M11 2H12V3H13V4H14V5H15V11H14V12H13V13H12V14H11V15H5V14H4V13H3V12H2V11H1V5H2V4H3V3H4V2H5V1H11V2Z"
      fill="currentColor"
    />

    {/* HIGHLIGHTS */}
    <path
      d="M3 6H2V5H3V6Z M4 5H3V4H4V5Z M5 4H4V3H5V4Z M6 3H5V2H6V3Z"
      fill="rgba(255,255,255,0.4)"
    />

    {/* SHADOWS */}
    <path
      d="M13 12H12V13H11V14H10V12H11V11H12V10H14V11H13V12Z"
      fill="rgba(0,0,0,0.25)"
    />
  </svg>
);
