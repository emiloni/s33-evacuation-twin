import type { Stairwell } from "@/lib/schema";
import {
  polygonCentroid,
  polygonToSvgPoints,
} from "@/lib/geometry-utils";
import { COLORS } from "@/lib/design-tokens";

interface StairwellBlockProps {
  stairwell: Stairwell;
}

export default function StairwellBlock({
  stairwell,
}: StairwellBlockProps) {
  const centroid = polygonCentroid(
    stairwell.polygon
  );

  return (
    <g pointerEvents="none">
      {/* Stairwell body */}
      <polygon
        points={polygonToSvgPoints(
          stairwell.polygon
        )}
        fill="#FFFFFF"
        stroke={COLORS.ink}
        strokeWidth={3}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Stair tread pattern */}
      {Array.from({ length: 7 }).map(
        (_, index) => {
          const y =
            centroid.y - 18 + index * 6;

          return (
            <line
              key={index}
              x1={centroid.x - 22}
              y1={y}
              x2={centroid.x + 22}
              y2={y}
              stroke={COLORS.muted}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          );
        }
      )}

      {/* Stair label */}
      <rect
        x={centroid.x - 26}
        y={centroid.y - 9}
        width={52}
        height={18}
        rx={4}
        fill="#FFFFFF"
        fillOpacity={0.9}
      />

      <text
        x={centroid.x}
        y={centroid.y + 3}
        textAnchor="middle"
        fontSize={7.5}
        fontWeight={800}
        fill={COLORS.ink}
        fontFamily="Inter, sans-serif"
        letterSpacing="0.8px"
      >
        STAIRS
      </text>
    </g>
  );
}