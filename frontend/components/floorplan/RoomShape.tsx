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
    ? COLORS.safeZone
    : COLORS.room;

  const stroke = isCorridor
    ? COLORS.safeZoneLine
    : isDraft
    ? COLORS.amber
    : COLORS.wall;

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
          strokeOpacity={0.16}
          vectorEffect="non-scaling-stroke"
        />
      )}

      <polygon
        points={polygonToSvgPoints(room.polygon)}
        fill={fill}
        fillOpacity={isCorridor ? 0.72 : 1}
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
          stroke={COLORS.safeZoneLine}
          strokeWidth={1.5}
          strokeOpacity={0.35}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}

      {!isCorridor && (
        <g pointerEvents="none">
          <rect
            x={
              centroid.x -
              Math.max(35, room.label.length * 4)
            }
            y={centroid.y - 14}
            width={Math.max(
              70,
              room.label.length * 8
            )}
            height={28}
            rx={5}
            fill="#FFFFFF"
            fillOpacity={0.78}
          />

          <text
            x={centroid.x}
            y={centroid.y + 4}
            textAnchor="middle"
            fontSize={10.5}
            fill={COLORS.ink}
            fontFamily="Inter, sans-serif"
            fontWeight={700}
            letterSpacing="0.5px"
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
            fill={COLORS.amber}
          />

          <text
            x={centroid.x + 9}
            y={centroid.y + 28}
            fontSize={8}
            fill={COLORS.amber}
            fontFamily="Inter, sans-serif"
            fontWeight={700}
          >
            REVIEW
          </text>
        </g>
      )}
    </g>
  );
}