import type { Door } from "@/lib/schema";
import { COLORS } from "@/lib/design-tokens";

interface DoorMarkerProps {
  door: Door;
}

export default function DoorMarker({
  door,
}: DoorMarkerProps) {
  const {
    position,
    angle = 0,
    accessible,
  } = door;

  return (
    <g
      transform={`translate(${position.x} ${position.y}) rotate(${angle})`}
    >
      {/* Door opening cut-out */}
      <line
        x1="-17"
        y1="0"
        x2="17"
        y2="0"
        stroke="#F7F7F3"
        strokeWidth="10"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Door frame */}
      <line
        x1="-17"
        y1="0"
        x2="17"
        y2="0"
        stroke={COLORS.wall}
        strokeWidth="2"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Door leaf */}
      <line
        x1="0"
        y1="0"
        x2="0"
        y2="-24"
        stroke={COLORS.ink}
        strokeWidth="2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Door swing arc */}
      <path
        d="M 0 -24 A 24 24 0 0 1 24 0"
        fill="none"
        stroke={COLORS.muted}
        strokeWidth="1.5"
        strokeDasharray="3 3"
        vectorEffect="non-scaling-stroke"
      />

      {/* Accessible door indicator */}
      {accessible && (
        <g>
          <circle
            cx="0"
            cy="9"
            r="6"
            fill="#FFFFFF"
            stroke={COLORS.accentTeal}
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />

          <text
            x="0"
            y="12"
            textAnchor="middle"
            fontSize="7"
            fontWeight="800"
            fill={COLORS.accentTeal}
            fontFamily="Inter, sans-serif"
          >
            A
          </text>
        </g>
      )}
    </g>
  );
}