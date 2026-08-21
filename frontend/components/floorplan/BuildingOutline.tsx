import type { Point } from "@/lib/schema";
import { polygonToSvgPoints } from "@/lib/geometry-utils";
import { BUILDING_OUTLINE_WIDTH, COLORS } from "@/lib/design-tokens";

interface BuildingOutlineProps {
  polygon: Point[];
}

export default function BuildingOutline({
  polygon,
}: BuildingOutlineProps) {
  if (!polygon.length) return null;

  return (
    <g pointerEvents="none">
      {/* Soft exterior halo */}
      <polygon
        points={polygonToSvgPoints(polygon)}
        fill="none"
        stroke={COLORS.ink}
        strokeWidth={BUILDING_OUTLINE_WIDTH + 8}
        strokeOpacity={0.06}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Main architectural boundary */}
      <polygon
        points={polygonToSvgPoints(polygon)}
        fill="none"
        stroke={COLORS.ink}
        strokeWidth={BUILDING_OUTLINE_WIDTH}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Inner boundary accent */}
      <polygon
        points={polygonToSvgPoints(polygon)}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={1.5}
        strokeOpacity={0.75}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}