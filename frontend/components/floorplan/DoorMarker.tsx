import type { Door } from "@/lib/schema";

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
      {/* Door opening cut-out for dark canvas */}
      <line
        x1="-17"
        y1="0"
        x2="17"
        y2="0"
        stroke="#0B0F17"
        strokeWidth="10"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Left door frame post */}
      <line
        x1="-17"
        y1="-4"
        x2="-17"
        y2="4"
        stroke="#F8FAFC"
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Right door frame post */}
      <line
        x1="17"
        y1="-4"
        x2="17"
        y2="4"
        stroke="#F8FAFC"
        strokeWidth="3"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Left open door leaf (Swung 75° leftward) */}
      <line
        x1="-17"
        y1="0"
        x2="-24"
        y2="-13"
        stroke="#38BDF8"
        strokeWidth="2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Right open door leaf (Swung 75° rightward) */}
      <line
        x1="17"
        y1="0"
        x2="24"
        y2="-13"
        stroke="#38BDF8"
        strokeWidth="2.5"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Dual door swing arcs */}
      <path
        d="M 0 0 A 17 17 0 0 1 -24 -13 M 0 0 A 17 17 0 0 0 24 -13"
        fill="none"
        stroke="#10B981"
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
            fill="#0F172A"
            stroke="#10B981"
            strokeWidth="1.5"
            vectorEffect="non-scaling-stroke"
          />

          <text
            x="0"
            y="12"
            textAnchor="middle"
            fontSize="7"
            fontWeight="800"
            fill="#10B981"
            fontFamily="ui-monospace, monospace"
          >
            A
          </text>
        </g>
      )}
    </g>
  );
}