import React from 'react';

interface BadgeProps {
  color?: string;
  className?: string;
}

export const CrownBadge = ({ color, className }: BadgeProps) => (
  <svg
    width="14"
    height="13"
    viewBox="0 0 14 13"
    fill="none"
    className={className}
    style={{ color }}
    shapeRendering="crispEdges"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M5 5H3V4H4V3H5V5Z" fill="black"/>
    <path d="M10 4H11V5H9V3H10V4Z" fill="black"/>
    <path d="M3 4H2V3H3V4Z" fill="black"/>
    <path d="M6 3H5V1H6V3Z" fill="black"/>
    <path d="M9 3H8V1H9V3Z" fill="black"/>
    <path d="M8 1H6V0H8V1Z" fill="black"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M14 13H0V2H2V3H1V9H13V3H12V4H11V3H12V2H14V13ZM1 10V12H13V10H1Z" fill="black"/>
    <path d="M13 12H1V10H13V12Z" fill="currentColor"/>
    <path d="M8 3H9V4H10V5H11V4H12V3H13V9H1V3H2V4H3V5H5V3H6V1H8V3Z" fill="currentColor"/>
    <path d="M8 8H6V7H8V8Z" fill="black"/>
    <path d="M6 7H5V6H6V7Z" fill="black"/>
    <path d="M9 7H8V6H9V7Z" fill="black"/>
    <path d="M8 6H6V5H8V6Z" fill="black"/>
    <g opacity="0.35">
      <path d="M2 12H1V11H2V12Z" fill="black"/>
      <path d="M13 12H12V11H13V12Z" fill="black"/>
      <path d="M2 8H3V9H1V7H2V8Z" fill="black"/>
      <path d="M13 9H11V8H12V7H13V9Z" fill="black"/>
    </g>
    <g opacity="0.4">
      <path d="M2 5H3V6H2V5Z" fill="white"/>
      <path d="M8 11H9V12H8V11Z" fill="white"/>
      <path d="M7 11H8V12H7V11Z" fill="white"/>
      <path d="M6 10H7V11H6V10Z" fill="white"/>
      <path d="M4 11H5V12H4V11Z" fill="white"/>
      <path d="M12 4H13V5H12V4Z" fill="white"/>
      <path d="M10 6H11V7H10V6Z" fill="white"/>
      <path d="M11 5H12V6H11V5Z" fill="white"/>
      <path d="M3 6H4V7H3V6Z" fill="white"/>
      <path d="M1 4H2V5H1V4Z" fill="white"/>
    </g>
  </svg>
);
