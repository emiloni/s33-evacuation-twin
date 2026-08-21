import type { ExitPoint } from "@/lib/schema";

interface ExitBadgeProps {
  exit: ExitPoint;
  highlighted?: boolean;
}

const directionRotation: Record<
  ExitPoint["direction"],
  number
> = {
  up: 0,
  right: 90,
  down: 180,
  left: 270,
};

export default function ExitBadge({
  exit,
  highlighted = false,
}: ExitBadgeProps) {
  const rotation = directionRotation[exit.direction];

  return (
    <g
      transform={`translate(${exit.position.x} ${exit.position.y})`}
      pointerEvents="none"
    >
      {/* EXIT AREA HIGHLIGHT */}
      {highlighted && (
        <>
          <circle
            r="34"
            fill="#064E3B"
            opacity="0.25"
          />

          <circle
            r="28"
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            strokeDasharray="5 4"
            opacity="0.85"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}

      {/* EXIT SIGN BODY */}
      <rect
        x="-23"
        y="-17"
        width="46"
        height="34"
        rx="8"
        fill="#0F172A"
        stroke="#10B981"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />

      {/* DIRECTION ARROW */}
      <g transform={`rotate(${rotation})`}>
        <path
          d="
            M 0 -11
            L 9 -1
            L 4 -1
            L 4 10
            L -4 10
            L -4 -1
            L -9 -1
            Z
          "
          fill="#10B981"
        />
      </g>

      {/* EXIT LABEL */}
      <text
        x="0"
        y="29"
        textAnchor="middle"
        fontSize="8"
        fontWeight="800"
        fill="#10B981"
        fontFamily="ui-monospace, monospace"
        letterSpacing="1px"
      >
        EXIT
      </text>

      {/* ACCESSIBILITY INDICATOR */}
      {exit.accessible && (
        <circle
          cx="0"
          cy="0"
          r="26"
          fill="none"
          stroke="#10B981"
          strokeWidth="1"
          strokeOpacity="0.4"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}