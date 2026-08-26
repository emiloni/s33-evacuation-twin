import type { Room } from "@/lib/schema";
import {
  polygonCentroid,
  polygonToSvgPoints,
} from "@/lib/geometry-utils";
import {
  COLORS,
  WALL_STROKE_WIDTH,
} from "@/lib/design-tokens";

interface RoomShapeProps {
  room: Room;
  selected?: boolean;
  onClick?: (room: Room) => void;
}

export default function RoomShape({
  room,
  selected = false,
  onClick,
}: RoomShapeProps) {
  const isDraft = room.confidence === "low";
  const isCorridor = room.type === "corridor";

  const centroid = polygonCentroid(room.polygon);

  const fill = isCorridor
    ? "#064E3B"
    : "#111827";

  const stroke = isCorridor
    ? "#10B981"
    : isDraft
    ? "#F59E0B"
    : "#334155";

  return (
    <g
      className="group"
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(room);
      }}
      style={{
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {selected && (
        <polygon
          points={polygonToSvgPoints(room.polygon)}
          fill="none"
          stroke={COLORS.accentTeal}
          strokeWidth={10}
          strokeOpacity={0.3}
          vectorEffect="non-scaling-stroke"
        />
      )}

      <polygon
        points={polygonToSvgPoints(room.polygon)}
        fill={fill}
        fillOpacity={isCorridor ? 0.75 : 0.95}
        stroke={stroke}
        strokeWidth={WALL_STROKE_WIDTH}
        strokeDasharray={isDraft ? "8 6" : undefined}
        vectorEffect="non-scaling-stroke"
        className="transition-opacity duration-200 group-hover:opacity-80"
      />

      {isCorridor && (
        <polyline
          points={polygonToSvgPoints(room.polygon)}
          fill="none"
          stroke="#10B981"
          strokeWidth={1.5}
          strokeOpacity={0.4}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}

      {!isCorridor && (
        <g pointerEvents="none">
          <rect
            x={
              centroid.x -
              Math.max(38, room.label.length * 4.5)
            }
            y={centroid.y - 14}
            width={Math.max(
              76,
              room.label.length * 9
            )}
            height={28}
            rx={6}
            fill="#1E293B"
            fillOpacity={0.92}
            stroke="#334155"
            strokeWidth={1}
          />

          <text
            x={centroid.x}
            y={centroid.y + 4}
            textAnchor="middle"
            fontSize={10}
            fill="#F8FAFC"
            fontFamily="ui-monospace, monospace"
            fontWeight={700}
            letterSpacing="0.8px"
          >
            {room.label.toUpperCase()}
          </text>
        </g>
      )}

      {isDraft && (
        <g pointerEvents="none">
          <circle
            cx={centroid.x}
            cy={centroid.y + 24}
            r={4}
            fill="#F59E0B"
          />

          <text
            x={centroid.x + 9}
            y={centroid.y + 28}
            fontSize={8}
            fill="#F59E0B"
            fontFamily="ui-monospace, monospace"
            fontWeight={700}
          >
            REVIEW
          </text>
        </g>
      )}
    </g>
  );
}