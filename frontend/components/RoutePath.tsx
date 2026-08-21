"use client";

import type { RouteSegment } from "@/lib/schema";
import { ROUTE_DASH, ROUTE_STROKE_WIDTH } from "@/lib/design-tokens";

interface RoutePathProps {
  route: RouteSegment;
  highlighted?: boolean;
}

export default function RoutePath({
  route,
  highlighted = false,
}: RoutePathProps) {
  if (route.path.length < 2) {
    return null;
  }

  const points = route.path
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <g pointerEvents="none">
      {/* Soft route glow */}
      <polyline
        points={points}
        fill="none"
        stroke="#0E8C7F"
        strokeWidth={highlighted ? 9 : 7}
        strokeOpacity={0.12}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Main evacuation route */}
      <polyline
        points={points}
        fill="none"
        stroke="#0E8C7F"
        strokeWidth={
          highlighted
            ? ROUTE_STROKE_WIDTH + 1
            : ROUTE_STROKE_WIDTH
        }
        strokeDasharray={ROUTE_DASH}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        className="route-flow"
      />

      {/* Direction markers */}
      {route.path.slice(1).map((point, index) => {
        const previous = route.path[index];

        const angle =
          Math.atan2(
            point.y - previous.y,
            point.x - previous.x
          ) *
          (180 / Math.PI);

        return (
          <path
            key={`${route.occupantId}-direction-${index}`}
            d="M -5 -4 L 5 0 L -5 4"
            transform={`translate(${point.x}, ${point.y}) rotate(${angle})`}
            fill="none"
            stroke="#0E8C7F"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            opacity={0.75}
          />
        );
      })}
    </g>
  );
}