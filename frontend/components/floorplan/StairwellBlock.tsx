import type { Stairwell } from "@/lib/schema";
import {
  polygonCentroid,
  polygonToSvgPoints,
} from "@/lib/geometry-utils";

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
        fill="#1F2937"
        stroke="#475569"
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
              stroke="#64748B"
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
        fill="#0F172A"
        fillOpacity={0.92}
        stroke="#334155"
        strokeWidth={1}
      />

      <text
        x={centroid.x}
        y={centroid.y + 3}
        textAnchor="middle"
        fontSize={7.5}
        fontWeight={800}
        fill="#F8FAFC"
        fontFamily="ui-monospace, monospace"
        letterSpacing="0.8px"
      >
        STAIRS
      </text>
    </g>
  );
}