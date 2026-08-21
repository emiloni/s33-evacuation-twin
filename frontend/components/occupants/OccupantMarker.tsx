"use client";

import type { Occupant } from "@/lib/schema";
import { PROFILE_COLORS, PROFILE_ICONS } from "@/lib/design-tokens";

interface OccupantMarkerProps {
  occupant: Occupant;
  selected?: boolean;
  onClick?: (occupant: Occupant) => void;
  positionOverride?: { x: number; y: number };
}

export default function OccupantMarker({
  occupant,
  selected = false,
  onClick,
  positionOverride,
}: OccupantMarkerProps) {
  const color = PROFILE_COLORS[occupant.profile];
  const icon = PROFILE_ICONS[occupant.profile];
  const pos = positionOverride || occupant.position;

  return (
    <g
      transform={`translate(${pos.x}, ${pos.y})`}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(occupant);
      }}
      style={{
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {/* SELECTION HALO */}
      {selected && (
        <circle
          r={18}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeOpacity={0.4}
          vectorEffect="non-scaling-stroke"
        />
      )}

      {/* SOFT SPATIAL GLOW */}
      <circle
        r={14}
        fill={color}
        fillOpacity={0.2}
      />

      {/* MAIN SPATIAL NODE */}
      <circle
        r={11}
        fill="#0B0F17"
        stroke={color}
        strokeWidth={3}
        vectorEffect="non-scaling-stroke"
      />

      {/* OCCUPANT ICON */}
      <text
        x={0}
        y={1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={10}
        pointerEvents="none"
      >
        {icon}
      </text>

      {/* STATUS PULSE DOT */}
      <circle
        cx={8}
        cy={-8}
        r={3.5}
        fill={color}
        stroke="#0B0F17"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}