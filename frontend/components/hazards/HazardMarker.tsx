"use client";

import type { Hazard } from "@/lib/schema";

interface HazardMarkerProps {
  hazard: Hazard;
}

const hazardConfig = {
  fire: {
    label: "FIRE HAZARD",
    symbol: "🔥",
    color: "#EF4444",
    radius: 36,
  },

  flood: {
    label: "FLOOD ZONE",
    symbol: "🌊",
    color: "#3B82F6",
    radius: 36,
  },

  blocked_corridor: {
    label: "CORRIDOR BLOCKED",
    symbol: "⚠️",
    color: "#F59E0B",
    radius: 34,
  },

  closed_exit: {
    label: "EXIT BLOCKED",
    symbol: "🚫",
    color: "#EF4444",
    radius: 34,
  },
} as const;

export default function HazardMarker({
  hazard,
}: HazardMarkerProps) {
  const config = hazardConfig[hazard.type];

  return (
    <g
      transform={`translate(${hazard.position.x} ${hazard.position.y})`}
      pointerEvents="none"
    >
      {/* EXPANDING HEAT SHOCKWAVE PULSE */}
      <circle
        r={config.radius * 2}
        fill={config.color}
        fillOpacity="0.08"
        className="hazard-beacon"
      />

      {/* HAZARD BUFFER DANGER ZONE */}
      <circle
        r={config.radius * 1.4}
        fill={config.color}
        fillOpacity="0.12"
        stroke={config.color}
        strokeWidth="2"
        strokeDasharray="6 4"
        vectorEffect="non-scaling-stroke"
      />

      {/* INNER DANGER RING */}
      <circle
        r={config.radius}
        fill={config.color}
        fillOpacity="0.25"
        stroke={config.color}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />

      {/* CENTRAL TACTICAL BADGE */}
      <circle
        r="18"
        fill="#0B0F17"
        stroke={config.color}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />

      {/* SYMBOL */}
      <text
        x="0"
        y="5"
        textAnchor="middle"
        fontSize="16"
        fontWeight="900"
      >
        {config.symbol}
      </text>

      {/* MONOSPACE DANGER LABEL */}
      <rect
        x={-config.label.length * 3.5 - 6}
        y="25"
        width={config.label.length * 7 + 12}
        height="18"
        rx="5"
        fill="#0B0F17"
        stroke={config.color}
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />

      <text
        x="0"
        y="37.5"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="800"
        fill="#F8FAFC"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.8px"
      >
        {config.label}
      </text>
    </g>
  );
}