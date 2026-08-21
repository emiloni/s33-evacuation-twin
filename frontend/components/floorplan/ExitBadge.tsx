import type { ExitPoint } from "@/lib/schema";
import { COLORS } from "@/lib/design-tokens";

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
  const rotation =
    directionRotation[exit.direction];

  return (
    <g
      transform={`translate(${exit.position.x} ${exit.position.y})`}
      pointerEvents="none"
    >
      {/* ================================================= */}
      {/* EXIT AREA HIGHLIGHT                               */}
      {/* ================================================= */}

      {highlighted && (
        <>
          <circle
            r="34"
            fill={COLORS.safeZone}
            opacity="0.12"
          />

          <circle
            r="28"
            fill="none"
            stroke={COLORS.accentTeal}
            strokeWidth="2"
            strokeDasharray="5 4"
            opacity="0.75"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}

      {/* ================================================= */}
      {/* EXIT SIGN                                         */}
      {/* ================================================= */}

      <rect
        x="-23"
        y="-17"
        width="46"
        height="34"
        rx="8"
        fill="#FFFFFF"
        stroke={COLORS.accentTeal}
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />

      {/* ================================================= */}
      {/* DIRECTION ARROW                                   */}
      {/* ================================================= */}

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
          fill={COLORS.accentTeal}
        />
      </g>

      {/* ================================================= */}
      {/* EXIT LABEL                                        */}
      {/* ================================================= */}

      <text
        x="0"
        y="29"
        textAnchor="middle"
        fontSize="8"
        fontWeight="800"
        fill={COLORS.accentTeal}
        fontFamily="Inter, sans-serif"
        letterSpacing="1px"
      >
        EXIT
      </text>

      {/* ================================================= */}
      {/* ACCESSIBILITY INDICATOR                           */}
      {/* ================================================= */}

      {exit.accessible && (
        <circle
          cx="0"
          cy="0"
          r="26"
          fill="none"
          stroke={COLORS.accentTeal}
          strokeWidth="1"
          strokeOpacity="0.3"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </g>
  );
}