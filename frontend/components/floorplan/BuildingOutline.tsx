import type { Point } from "@/lib/schema";
import { polygonToSvgPoints } from "@/lib/geometry-utils";
import { BUILDING_OUTLINE_WIDTH } from "@/lib/design-tokens";

interface BuildingOutlineProps {
  polygon: Point[];
}

export default function BuildingOutline({
  polygon,
}: BuildingOutlineProps) {
  if (!polygon || !polygon.length) return null;

  return (
    <g pointerEvents="none">
      {/* Exterior glow halo */}
      <polygon
        points={polygonToSvgPoints(polygon)}
        fill="none"
        stroke="#38BDF8"
        strokeWidth={BUILDING_OUTLINE_WIDTH + 8}
        strokeOpacity={0.1}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Main architectural boundary wall */}
      <polygon
        points={polygonToSvgPoints(polygon)}
        fill="none"
        stroke="#F8FAFC"
        strokeWidth={BUILDING_OUTLINE_WIDTH}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Inner boundary accent line */}
      <polygon
        points={polygonToSvgPoints(polygon)}
        fill="none"
        stroke="#1E293B"
        strokeWidth={1.5}
        strokeOpacity={0.8}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}