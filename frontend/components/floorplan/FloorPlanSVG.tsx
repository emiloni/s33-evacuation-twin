"use client";

import { useMemo, useState } from "react";

import type {
  FloorGeometry,
  Room,
  Occupant,
  RouteSegment,
} from "@/lib/schema";

import RoomShape from "./RoomShape";
import ExitBadge from "./ExitBadge";

interface FloorPlanSVGProps {
  geometry: FloorGeometry;
  editable?: boolean;
  occupants?: Occupant[];
  routes?: RouteSegment[];
}

export default function FloorPlanSVG({
  geometry,
  editable = false,
  occupants = [],
  routes = [],
}: FloorPlanSVGProps) {
  const [selectedRoomId, setSelectedRoomId] =
    useState<string | null>(null);

  const selectedRoom = useMemo(
    () =>
      geometry.rooms.find(
        (room) => room.id === selectedRoomId
      ),
    [geometry.rooms, selectedRoomId]
  );

  /*
   * ---------------------------------------------------------
   * GEOMETRY CENTERS
   * ---------------------------------------------------------
   */

  const geometryPoints = useMemo(() => {
    const points = new Map<
      string,
      { x: number; y: number }
    >();

    geometry.rooms.forEach((room) => {
      if (!room.polygon.length) {
        return;
      }

      const x =
        room.polygon.reduce(
          (sum, point) => sum + point.x,
          0
        ) / room.polygon.length;

      const y =
        room.polygon.reduce(
          (sum, point) => sum + point.y,
          0
        ) / room.polygon.length;

      points.set(room.id, {
        x,
        y,
      });
    });

    geometry.stairwells.forEach(
      (stairwell) => {
        if (!stairwell.polygon.length) {
          return;
        }

        const x =
          stairwell.polygon.reduce(
            (sum, point) =>
              sum + point.x,
            0
          ) /
          stairwell.polygon.length;

        const y =
          stairwell.polygon.reduce(
            (sum, point) =>
              sum + point.y,
            0
          ) /
          stairwell.polygon.length;

        points.set(stairwell.id, {
          x,
          y,
        });
      }
    );

    geometry.exits.forEach((exit) => {
      points.set(exit.id, exit.position);
    });

    return points;
  }, [
    geometry.rooms,
    geometry.stairwells,
    geometry.exits,
  ]);

  const nodePolygons = useMemo(() => {
    const polygons = new Map<string, { x: number; y: number }[]>();

    geometry.rooms.forEach((room) => {
      polygons.set(room.id, room.polygon);
    });
    geometry.stairwells.forEach((stairwell) => {
      polygons.set(stairwell.id, stairwell.polygon);
    });

    return polygons;
  }, [geometry.rooms, geometry.stairwells]);

  const getConnectionAnchor = (
    nodeId: string,
    toward: { x: number; y: number }
  ) => {
    const center = geometryPoints.get(nodeId);
    const polygon = nodePolygons.get(nodeId);

    if (!center || !polygon) {
      return center ?? toward;
    }

    const minX = Math.min(...polygon.map((point) => point.x));
    const maxX = Math.max(...polygon.map((point) => point.x));
    const minY = Math.min(...polygon.map((point) => point.y));
    const maxY = Math.max(...polygon.map((point) => point.y));
    const dx = toward.x - center.x;
    const dy = toward.y - center.y;
    const scale = Math.min(
      dx === 0 ? Infinity : (maxX - minX) / 2 / Math.abs(dx),
      dy === 0 ? Infinity : (maxY - minY) / 2 / Math.abs(dy)
    );

    return {
      x: center.x + dx * scale,
      y: center.y + dy * scale,
    };
  };

  /*
   * ---------------------------------------------------------
   * ROOM CLICK
   * ---------------------------------------------------------
   */

  const handleRoomClick = (
    room: Room
  ) => {
    if (!editable) {
      return;
    }

    setSelectedRoomId((current) =>
      current === room.id
        ? null
        : room.id
    );
  };

  /*
   * ---------------------------------------------------------
   * CONNECTION PATH
   * ---------------------------------------------------------
   *
   * Direct paths keep the connectivity layer faithful to the uploaded
   * node graph and easy to scan during an evacuation.
   */

  const createConnectionPath = (
    from: { x: number; y: number },
    to: { x: number; y: number }
  ) => {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  };

  /*
   * ---------------------------------------------------------
   * SVG
   * ---------------------------------------------------------
   */

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-slate-200 bg-[#F7F7F3] shadow-sm">

      {/* =====================================================
          HEADER OVERLAY
      ===================================================== */}

      <div className="pointer-events-none absolute left-5 top-5 z-10">
        <div className="rounded-xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur">

          <div className="flex items-center gap-2">

            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />

            <span className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
              Floor Plan
            </span>

          </div>

          <div className="mt-1 text-lg font-semibold text-slate-900">
            Floor {geometry.floorLevel}
          </div>

        </div>
      </div>


      {/* =====================================================
          ROUTING STATUS
      ===================================================== */}

      {routes.length > 0 && (
        <div className="pointer-events-none absolute right-5 top-5 z-10">

          <div className="rounded-xl border border-emerald-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">

            <div className="flex items-center gap-2">

              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />

              <span className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600">
                Evacuation routing active
              </span>

            </div>

            <div className="mt-1 text-sm font-bold text-slate-900">
              {routes.length} routes calculated
            </div>

          </div>

        </div>
      )}


      {/* =====================================================
          CONFIDENCE LEGEND
      ===================================================== */}

      <div className="pointer-events-none absolute bottom-5 left-5 z-10">

        <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-xs shadow-sm backdrop-blur">

          <div className="flex items-center gap-2">

            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <span className="text-slate-600">
              Verified
            </span>

          </div>

          <div className="flex items-center gap-2">

            <span className="h-2 w-2 rounded-full bg-amber-500" />

            <span className="text-slate-600">
              AI review
            </span>

          </div>

          {routes.length > 0 && (
            <div className="flex items-center gap-2">

              <span className="h-2 w-2 rounded-full bg-emerald-600" />

              <span className="font-semibold text-slate-600">
                Evacuation route
              </span>

            </div>
          )}

        </div>

      </div>


      {/* =====================================================
          SELECTED ROOM
      ===================================================== */}

      {editable && selectedRoom && (
        <div className="absolute right-5 top-20 z-10 w-64 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">

          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
            Selected Room
          </div>

          <div className="mt-1 text-base font-semibold text-slate-900">
            {selectedRoom.label}
          </div>

          <div className="mt-2 text-xs capitalize text-slate-500">
            {selectedRoom.type.replace(
              "_",
              " "
            )}
          </div>

          {selectedRoom.confidence ===
            "low" && (
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              AI confidence is low. Review this geometry.
            </div>
          )}

        </div>
      )}


      {/* =====================================================
          SVG
      ===================================================== */}

      <svg
        viewBox="0 0 1000 800"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >

        {/* =================================================
            DEFINITIONS
        ================================================= */}

        <defs>

          <pattern
            id="floor-grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#D8D8D0"
              strokeWidth="0.7"
              opacity="0.45"
            />
          </pattern>


          <filter
            id="route-glow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur
              stdDeviation="3"
              result="blur"
            />

            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>

          </filter>


          <marker
            id="route-arrow"
            markerWidth="9"
            markerHeight="9"
            refX="7"
            refY="4.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path
              d="M 0 0 L 9 4.5 L 0 9 z"
              fill="#059669"
            />
          </marker>


          <filter
            id="occupant-shadow"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >

            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="2"
              floodOpacity="0.18"
            />

          </filter>

        </defs>


        {/* =================================================
            BACKGROUND
        ================================================= */}

        <rect
          x="0"
          y="0"
          width="1000"
          height="800"
          fill="#F7F7F3"
        />


        {/* =================================================
            GRID
        ================================================= */}

        <rect
          x="0"
          y="0"
          width="1000"
          height="800"
          fill="url(#floor-grid)"
        />


        {/* =================================================
            BUILDING OUTLINE
        ================================================= */}

        {geometry.buildingOutline &&
          geometry.buildingOutline.length >
            2 && (
            <polygon
              points={geometry.buildingOutline
                .map(
                  (point) =>
                    `${point.x},${point.y}`
                )
                .join(" ")}
              fill="#FAFAF8"
              stroke="#1A1A1A"
              strokeWidth={6}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          )}


        {/* =================================================
            HAZARDS
        ================================================= */}

        {geometry.hazards?.map(
          (hazard) => (
            <g
              key={hazard.id}
              pointerEvents="none"
            >

              <circle
                cx={
                  hazard.position.x
                }
                cy={
                  hazard.position.y
                }
                r="32"
                fill="#D62F2F"
                fillOpacity="0.08"
              >

                <animate
                  attributeName="r"
                  values="24;38;24"
                  dur="2s"
                  repeatCount="indefinite"
                />

                <animate
                  attributeName="opacity"
                  values="0.8;0.2;0.8"
                  dur="2s"
                  repeatCount="indefinite"
                />

              </circle>


              <circle
                cx={
                  hazard.position.x
                }
                cy={
                  hazard.position.y
                }
                r="20"
                fill="#D62F2F"
                fillOpacity="0.14"
                stroke="#D62F2F"
                strokeWidth="2"
                strokeDasharray="5 4"
                vectorEffect="non-scaling-stroke"
              />


              <text
                x={
                  hazard.position.x
                }
                y={
                  hazard.position.y + 7
                }
                textAnchor="middle"
                fontSize="22"
              >
                🔥
              </text>


              <rect
                x={
                  hazard.position.x - 42
                }
                y={
                  hazard.position.y - 48
                }
                width="84"
                height="20"
                rx="6"
                fill="#991B1B"
                fillOpacity="0.94"
              />

              <text
                x={
                  hazard.position.x
                }
                y={
                  hazard.position.y - 34
                }
                textAnchor="middle"
                fontSize="8"
                fontFamily="Inter, sans-serif"
                fontWeight="800"
                letterSpacing="1"
                fill="white"
              >
                {hazard.type
                  .replace(
                    "_",
                    " "
                  )
                  .toUpperCase()}
              </text>

            </g>
          )
        )}


        {/* =================================================
            BUILDING CONNECTIONS
            IMPORTANT:
            These are rendered BEFORE rooms and route.
        ================================================= */}

        <g
          pointerEvents="none"
          className="building-connections"
        >

          {geometry.doors.map(
            (door) => {

              const from =
                geometryPoints.get(
                  door.connects[0]
                );

              const to =
                geometryPoints.get(
                  door.connects[1]
                );

              if (!from || !to) {
                return null;
              }

              const blocked =
                !door.accessible;

              const fromAnchor = getConnectionAnchor(door.connects[0], to);
              const toAnchor = getConnectionAnchor(door.connects[1], from);

              const path = createConnectionPath(fromAnchor, toAnchor);

              const midX =
                (fromAnchor.x + toAnchor.x) /
                2;

              const midY =
                (fromAnchor.y + toAnchor.y) /
                2;

              return (
                <g
                  key={`connection-${door.id}`}
                >

                  {/* White separation layer */}

                  <path
                    d={path}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth={15}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                    vectorEffect="non-scaling-stroke"
                  />


                  {/* Building connection */}

                  <path
                    d={path}
                    fill="none"
                    stroke={
                      blocked
                        ? "#EF4444"
                        : "#94A3B8"
                    }
                    strokeWidth={
                      blocked ? 5 : 2.5
                    }
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray={
                      blocked
                        ? "9 7"
                        : undefined
                    }
                    opacity={
                      blocked
                        ? 0.95
                        : 0.85
                    }
                    vectorEffect="non-scaling-stroke"
                  />


                  {/* Blocked marker */}

                  {blocked && (
                    <g>

                      <circle
                        cx={midX}
                        cy={midY}
                        r="10"
                        fill="#EF4444"
                        stroke="white"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />

                      <text
                        x={midX}
                        y={midY + 4}
                        textAnchor="middle"
                        fontSize="11"
                        fontWeight="900"
                        fill="white"
                      >
                        ×
                      </text>

                    </g>
                  )}

                </g>
              );
            }
          )}

        </g>


        {/* =================================================
            ROOMS
        ================================================= */}

        {geometry.rooms.map(
          (room) => (
            <RoomShape
              key={room.id}
              room={room}
              selected={
                selectedRoomId ===
                room.id
              }
              onClick={
                editable
                  ? handleRoomClick
                  : undefined
              }
            />
          )
        )}


        {/* =================================================
            STAIRWELLS
        ================================================= */}

        {geometry.stairwells.map(
          (stairwell) => (

            <g
              key={stairwell.id}
              pointerEvents="none"
            >

              <polygon
                points={stairwell.polygon
                  .map(
                    (point) =>
                      `${point.x},${point.y}`
                  )
                  .join(" ")}
                fill="#E8EDF0"
                stroke="#52616B"
                strokeWidth="4"
                vectorEffect="non-scaling-stroke"
              />


              {Array.from({
                length: 5,
              }).map(
                (_, index) => {

                  const minX =
                    Math.min(
                      ...stairwell.polygon.map(
                        (p) =>
                          p.x
                      )
                    );

                  const maxX =
                    Math.max(
                      ...stairwell.polygon.map(
                        (p) =>
                          p.x
                      )
                    );

                  const minY =
                    Math.min(
                      ...stairwell.polygon.map(
                        (p) =>
                          p.y
                      )
                    );

                  const maxY =
                    Math.max(
                      ...stairwell.polygon.map(
                        (p) =>
                          p.y
                      )
                    );

                  const y =
                    minY +
                    ((maxY -
                      minY) /
                      6) *
                      (index + 1);

                  return (
                    <line
                      key={index}
                      x1={minX + 8}
                      y1={y}
                      x2={maxX - 8}
                      y2={y}
                      stroke="#7A8790"
                      strokeWidth="2"
                      vectorEffect="non-scaling-stroke"
                    />
                  );
                }
              )}


              <text
                x={
                  stairwell.polygon.reduce(
                    (
                      sum,
                      point
                    ) =>
                      sum +
                      point.x,
                    0
                  ) /
                  stairwell
                    .polygon
                    .length
                }
                y={
                  stairwell.polygon.reduce(
                    (
                      sum,
                      point
                    ) =>
                      sum +
                      point.y,
                    0
                  ) /
                    stairwell
                      .polygon
                      .length +
                  4
                }
                textAnchor="middle"
                fontSize="11"
                fontWeight="900"
                fontFamily="Inter, sans-serif"
                fill="#52616B"
              >
                STAIRS
              </text>

            </g>
          )
        )}


        {/* =================================================
            EVACUATION ROUTE
            IMPORTANT:
            Route is rendered AFTER the building.
        ================================================= */}

        {routes.map(
          (route) => {

            if (
              !route.path ||
              route.path.length <
                2
            ) {
              return null;
            }

            const points =
              route.path
                .map(
                  (point) =>
                    `${point.x},${point.y}`
                )
                .join(" ");

            return (
              <g
                key={`route-${route.occupantId}`}
                pointerEvents="none"
              >

                {/* Route glow */}

                <polyline
                  points={points}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="12"
                  strokeOpacity="0.12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#route-glow)"
                  vectorEffect="non-scaling-stroke"
                />


                {/* White separator */}

                <polyline
                  points={points}
                  fill="none"
                  stroke="white"
                  strokeWidth="9"
                  strokeOpacity="0.85"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />


                {/* Main route */}

                <polyline
                  points={points}
                  fill="none"
                  stroke="#059669"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="14 7"
                  markerMid="url(#route-arrow)"
                  vectorEffect="non-scaling-stroke"
                >

                  <animate
                    attributeName="stroke-dashoffset"
                    from="0"
                    to="-42"
                    dur="1.1s"
                    repeatCount="indefinite"
                  />

                </polyline>


                {/* Start */}

                <circle
                  cx={
                    route.path[0].x
                  }
                  cy={
                    route.path[0].y
                  }
                  r="8"
                  fill="white"
                  stroke="#059669"
                  strokeWidth="4"
                  vectorEffect="non-scaling-stroke"
                />


                {/* Start label */}

                <text
                  x={
                    route.path[0].x
                  }
                  y={
                    route.path[0].y -
                    14
                  }
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="900"
                  fontFamily="Inter, sans-serif"
                  fill="#047857"
                >
                  START
                </text>


                {/* Destination */}

                <circle
                  cx={
                    route.path[
                      route.path.length -
                        1
                    ].x
                  }
                  cy={
                    route.path[
                      route.path.length -
                        1
                    ].y
                  }
                  r="9"
                  fill="#059669"
                  stroke="white"
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />


                {/* Destination label */}

                <text
                  x={
                    route.path[
                      route.path.length -
                        1
                    ].x
                  }
                  y={
                    route.path[
                      route.path.length -
                        1
                    ].y + 24
                  }
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="900"
                  fontFamily="Inter, sans-serif"
                  fill="#047857"
                >
                  EXIT
                </text>

              </g>
            );
          }
        )}
{/* =================================================
    BUILDING LABELS
    Rendered above route so names remain readable
================================================= */}

<g
  pointerEvents="none"
  className="building-labels"
>
  {geometry.rooms.map((room) => {
    if (!room.polygon.length) {
      return null;
    }

    const centerX =
      room.polygon.reduce(
        (sum, point) => sum + point.x,
        0
      ) / room.polygon.length;

    const centerY =
      room.polygon.reduce(
        (sum, point) => sum + point.y,
        0
      ) / room.polygon.length;

    const label =
      room.label ||
      room.id;

    const isCorridor =
      room.type === "corridor";

    const isRoom =
      room.type !== "corridor";

    return (
      <g key={`label-${room.id}`}>
        {/* White label background */}

        <rect
          x={centerX - (isCorridor ? 52 : 48)}
          y={centerY - 13}
          width={isCorridor ? 104 : 96}
          height="26"
          rx="7"
          fill="white"
          fillOpacity="0.92"
          stroke="none"
          vectorEffect="non-scaling-stroke"
        />

        {/* Main name */}

        <text
          x={centerX}
          y={centerY + 3}
          textAnchor="middle"
          fontSize={
            isCorridor ? "9" : "10"
          }
          fontWeight="800"
          fontFamily="Inter, Arial, sans-serif"
          fill="#0F172A"
        >
          {label}
        </text>

        {/* Small ID */}

        {isRoom && (
          <text
            x={centerX}
            y={centerY + 16}
            textAnchor="middle"
            fontSize="7"
            fontWeight="600"
            fontFamily="Inter, Arial, sans-serif"
            fill="#64748B"
          >
            {room.id}
          </text>
        )}
      </g>
    );
  })}


  {/* =================================================
      STAIR LABELS
  ================================================= */}

  {geometry.stairwells.map(
    (stairwell) => {
      if (!stairwell.polygon.length) {
        return null;
      }

      const centerX =
        stairwell.polygon.reduce(
          (sum, point) =>
            sum + point.x,
          0
        ) /
        stairwell.polygon.length;

      const centerY =
        stairwell.polygon.reduce(
          (sum, point) =>
            sum + point.y,
          0
        ) /
        stairwell.polygon.length;

      return (
        <g
          key={`stair-label-${stairwell.id}`}
        >
          <rect
            x={centerX - 34}
            y={centerY - 12}
            width="68"
            height="24"
            rx="6"
            fill="white"
            fillOpacity="0.88"
            stroke="#64748B"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          <text
            x={centerX}
            y={centerY + 4}
            textAnchor="middle"
            fontSize="9"
            fontWeight="900"
            fontFamily="Inter, Arial, sans-serif"
            fill="#334155"
          >
            STAIRS
          </text>
        </g>
      );
    }
  )}
</g>

        {/* =================================================
            EXITS
        ================================================= */}

        {geometry.exits.map(
          (exit) => (
            <ExitBadge
              key={exit.id}
              exit={exit}
            />
          )
        )}


        {/* =================================================
            OCCUPANTS
        ================================================= */}

        {occupants.map(
          (occupant) => {

            const profileData = {
              normal: {
                color: "#3A3A3A",
                icon: "●",
              },

              wheelchair: {
                color: "#1E62D0",
                icon: "♿",
              },

              child: {
                color: "#D0428A",
                icon: "●",
              },

              elderly: {
                color: "#7A5AC1",
                icon: "●",
              },

              temporary_injury: {
                color: "#E08A00",
                icon: "🩼",
              },
            };

            const profile =
              profileData[
                occupant.profile
              ];

            return (
              <g
                key={occupant.id}
                pointerEvents="none"
                filter="url(#occupant-shadow)"
              >

                <circle
                  cx={
                    occupant.position.x
                  }
                  cy={
                    occupant.position.y
                  }
                  r="13"
                  fill="white"
                  stroke={
                    profile.color
                  }
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />


                <circle
                  cx={
                    occupant.position.x
                  }
                  cy={
                    occupant.position.y
                  }
                  r="8"
                  fill={
                    profile.color
                  }
                />


                <text
                  x={
                    occupant.position.x
                  }
                  y={
                    occupant.position.y +
                    4
                  }
                  textAnchor="middle"
                  fontSize={
                    occupant.profile ===
                    "wheelchair"
                      ? "10"
                      : "7"
                  }
                  fontWeight="900"
                  fill="white"
                >
                  {profile.icon}
                </text>


                <rect
                  x={
                    occupant.position.x +
                    14
                  }
                  y={
                    occupant.position.y -
                    9
                  }
                  width="42"
                  height="18"
                  rx="5"
                  fill="white"
                  fillOpacity="0.92"
                />


                <text
                  x={
                    occupant.position.x +
                    35
                  }
                  y={
                    occupant.position.y +
                    3
                  }
                  textAnchor="middle"
                  fontSize="7"
                  fontFamily="Inter, sans-serif"
                  fontWeight="700"
                  fill="#475569"
                >
                  {occupant.id.replace(
                    "occupant-",
                    "#"
                  )}
                </text>

              </g>
            );
          }
        )}

      </svg>
    </div>
  );
}
