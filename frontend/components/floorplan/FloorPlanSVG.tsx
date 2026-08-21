"use client";

import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
} from "react";

import type {
  FloorGeometry,
  Room,
  Occupant,
  RouteSegment,
  MobilityProfile,
} from "@/lib/schema";

import RoomShape from "./RoomShape";
import DoorMarker from "./DoorMarker";
import ExitBadge from "./ExitBadge";
import HazardMarker from "../hazards/HazardMarker";
import OccupantMarker from "../occupants/OccupantMarker";
import StairwellBlock from "./StairwellBlock";
import BuildingOutline from "./BuildingOutline";
import IconButton from "@/components/ui/IconButton";

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

  const [zoomLevel, setZoomLevel] =
    useState<number>(1);

  const [panOffset, setPanOffset] =
    useState<{ x: number; y: number }>({
      x: 0,
      y: 0,
    });

  const [isDragging, setIsDragging] =
    useState<boolean>(false);

  const [dragStart, setDragStart] =
    useState<{ x: number; y: number }>({
      x: 0,
      y: 0,
    });

  const [showGrid, setShowGrid] =
    useState<boolean>(true);

  const [is3D, setIs3D] =
    useState<boolean>(false);

  const selectedRoom = useMemo(
    () =>
      geometry.rooms.find(
        (room) =>
          room.id === selectedRoomId
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
          (sum, point) =>
            sum + point.x,
          0
        ) / room.polygon.length;

      const y =
        room.polygon.reduce(
          (sum, point) =>
            sum + point.y,
          0
        ) / room.polygon.length;

      points.set(room.id, { x, y });
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
          ) / stairwell.polygon.length;

        const y =
          stairwell.polygon.reduce(
            (sum, point) =>
              sum + point.y,
            0
          ) / stairwell.polygon.length;

        points.set(stairwell.id, {
          x,
          y,
        });
      }
    );

    geometry.exits.forEach((exit) => {
      points.set(
        exit.id,
        exit.position
      );
    });

    return points;
  }, [
    geometry.rooms,
    geometry.stairwells,
    geometry.exits,
  ]);

  const nodePolygons = useMemo(() => {
    const polygons = new Map<
      string,
      { x: number; y: number }[]
    >();

    geometry.rooms.forEach((room) => {
      polygons.set(
        room.id,
        room.polygon
      );
    });

    geometry.stairwells.forEach(
      (stairwell) => {
        polygons.set(
          stairwell.id,
          stairwell.polygon
        );
      }
    );

    return polygons;
  }, [
    geometry.rooms,
    geometry.stairwells,
  ]);

  /*
   * ---------------------------------------------------------
   * CONNECTION GEOMETRY
   * ---------------------------------------------------------
   *
   * Backend connections are represented by
   * geometry.connections.
   *
   * Existing floor-plan geometry also has doors,
   * so doors are used as a fallback.
   */

  const connectionItems = useMemo(() => {
    if (
      geometry.connections &&
      geometry.connections.length > 0
    ) {
      return geometry.connections.map(
        (connection) => ({
          id: connection.id,
          from: connection.from,
          to: connection.to,
          accessible:
            connection.accessible,
        })
      );
    }

    return geometry.doors.map((door) => ({
      id: door.id,
      from: door.connects[0],
      to: door.connects[1],
      accessible: door.accessible,
    }));
  }, [
    geometry.connections,
    geometry.doors,
  ]);

  const getConnectionAnchor = useCallback(
    (
      nodeId: string,
      toward: { x: number; y: number }
    ) => {
      const center =
        geometryPoints.get(nodeId);

      const polygon =
        nodePolygons.get(nodeId);

      if (!center || !polygon) {
        return center ?? toward;
      }

      const minX = Math.min(
        ...polygon.map(
          (point) => point.x
        )
      );

      const maxX = Math.max(
        ...polygon.map(
          (point) => point.x
        )
      );

      const minY = Math.min(
        ...polygon.map(
          (point) => point.y
        )
      );

      const maxY = Math.max(
        ...polygon.map(
          (point) => point.y
        )
      );

      const dx =
        toward.x - center.x;

      const dy =
        toward.y - center.y;

      const scale = Math.min(
        dx === 0
          ? Infinity
          : ((maxX - minX) / 2) /
              Math.abs(dx),

        dy === 0
          ? Infinity
          : ((maxY - minY) / 2) /
              Math.abs(dy)
      );

      return {
        x: center.x + dx * scale,
        y: center.y + dy * scale,
      };
    },
    [geometryPoints, nodePolygons]
  );

  const createConnectionPath = useCallback(
    (
      from: { x: number; y: number },
      to: { x: number; y: number }
    ) => {
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    },
    []
  );

  /*
   * ---------------------------------------------------------
   * ROOM CLICK
   * ---------------------------------------------------------
   */

  const handleRoomClick = useCallback(
    (room: Room) => {
      if (!editable) {
        return;
      }

      setSelectedRoomId((current) =>
        current === room.id
          ? null
          : room.id
      );
    },
    [editable]
  );

  /*
   * ---------------------------------------------------------
   * VIEWPORT
   * ---------------------------------------------------------
   */

  const handleZoomIn = () =>
    setZoomLevel((prev) =>
      Math.min(
        prev + 0.25,
        2.5
      )
    );

  const handleZoomOut = () =>
    setZoomLevel((prev) =>
      Math.max(
        prev - 0.25,
        0.6
      )
    );

  const handleResetView = () => {
    setZoomLevel(1);
    setPanOffset({
      x: 0,
      y: 0,
    });
  };

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.target instanceof
          HTMLInputElement ||
        event.target instanceof
          HTMLTextAreaElement
      ) {
        return;
      }

      if (
        event.key === "+" ||
        event.key === "="
      ) {
        handleZoomIn();
      }

      if (event.key === "-") {
        handleZoomOut();
      }

      if (event.key === "0") {
        handleResetView();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
  }, []);

  const handleMouseDown = (
    event: React.MouseEvent
  ) => {
    if (event.button !== 0) {
      return;
    }

    setIsDragging(true);

    setDragStart({
      x:
        event.clientX -
        panOffset.x,
      y:
        event.clientY -
        panOffset.y,
    });
  };

  const handleMouseMove = (
    event: React.MouseEvent
  ) => {
    if (!isDragging) {
      return;
    }

    setPanOffset({
      x:
        event.clientX -
        dragStart.x,
      y:
        event.clientY -
        dragStart.y,
    });
  };

  const handleMouseUp = () =>
    setIsDragging(false);

  /*
   * ---------------------------------------------------------
   * OCCUPANT PROFILE DISPLAY
   * ---------------------------------------------------------
   */

  const profileData: Record<
    MobilityProfile,
    {
      color: string;
      icon: string;
    }
  > = {
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

    first_responder: {
      color: "#10B981",
      icon: "🚨",
    },
  };

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl border border-[#111B24] bg-[#05070A] shadow-inner select-none perspective-container digital-twin-canvas"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* =====================================================
          SYSTEM STATUS
      ====================================================== */}

      <div className="pointer-events-none absolute left-5 top-5 z-20 flex flex-col gap-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Spatial Digital Twin
            </span>
          </div>

          <div className="mt-0.5 font-mono text-sm font-bold text-slate-100">
            FL 0{geometry.floorLevel}{" "}
            ARCHITECTURAL MODEL
          </div>
        </div>
      </div>

      {/* =====================================================
          ROUTING STATUS
      ====================================================== */}

      {routes.length > 0 && (
        <div className="pointer-events-none absolute right-5 top-5 z-20">
          <div className="rounded-xl border border-emerald-800 bg-slate-900/90 px-4 py-3 shadow-md backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />

              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                Egress Vector Active
              </span>
            </div>

            <div className="mt-0.5 font-mono text-sm font-bold text-slate-100 tabular-nums">
              {routes.length} Active Routes Generated
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          VIEWPORT TOOLBAR
      ====================================================== */}

      <div className="absolute right-5 bottom-5 z-20 flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/90 p-1.5 shadow-md backdrop-blur-md">
        <IconButton
          icon={
            <span className="font-mono text-xs font-bold">
              {is3D
                ? "3D Isometric"
                : "2D Plan"}
            </span>
          }
          label="Toggle 3D Perspective Mode"
          variant={
            is3D
              ? "primary"
              : "ghost"
          }
          onClick={() =>
            setIs3D(
              (prev) => !prev
            )
          }
          className={
            is3D
              ? "bg-emerald-600 text-slate-950 hover:bg-emerald-500"
              : "text-slate-300 hover:text-white"
          }
        />

        <div className="h-4 w-[1px] bg-slate-800 mx-1" />

        <IconButton
          icon={
            <span className="text-sm font-black">
              +
            </span>
          }
          label="Zoom In"
          variant="ghost"
          onClick={handleZoomIn}
          className="text-slate-300 hover:text-white"
        />

        <span className="font-mono text-[11px] font-bold text-slate-400 tabular-nums px-1">
          {Math.round(
            zoomLevel * 100
          )}
          %
        </span>

        <IconButton
          icon={
            <span className="text-sm font-black">
              −
            </span>
          }
          label="Zoom Out"
          variant="ghost"
          onClick={handleZoomOut}
          className="text-slate-300 hover:text-white"
        />

        <div className="h-4 w-[1px] bg-slate-800 mx-1" />

        <IconButton
          icon={
            <span className="font-mono text-xs font-bold">
              Fit
            </span>
          }
          label="Reset View"
          variant="ghost"
          onClick={
            handleResetView
          }
          className="text-slate-300 hover:text-white"
        />

        <IconButton
          icon={
            <span className="font-mono text-xs font-bold">
              {showGrid
                ? "Grid On"
                : "Grid Off"}
            </span>
          }
          label="Toggle Grid"
          variant={
            showGrid
              ? "default"
              : "ghost"
          }
          onClick={() =>
            setShowGrid(
              (prev) => !prev
            )
          }
          className="text-slate-300 hover:text-white"
        />
      </div>

      {/* =====================================================
          LEGEND
      ====================================================== */}

      <div className="pointer-events-none absolute bottom-5 left-5 z-20">
        <div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-2 text-xs shadow-md backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="font-mono text-[11px] font-medium text-slate-300">
              Verified Geometry
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="font-mono text-[11px] font-medium text-slate-300">
              AI Review
            </span>
          </div>

          {routes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-400" />

              <span className="font-mono text-[11px] font-bold text-teal-400">
                Evacuation Path
              </span>
            </div>
          )}

          {geometry.connections?.length >
            0 && (
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-slate-400" />

              <span className="font-mono text-[11px] font-medium text-slate-300">
                Backend Graph
              </span>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          ROOM INSPECTOR
      ====================================================== */}

      {editable &&
        selectedRoom && (
          <div className="absolute right-5 top-20 z-20 w-64 rounded-xl border border-slate-800 bg-slate-900/95 p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Selected Zone
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRoomId(
                    null
                  )
                }
                className="text-xs text-slate-500 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="mt-1 text-base font-bold text-slate-100">
              {
                selectedRoom.label
              }
            </div>

            <div className="mt-1 font-mono text-xs text-slate-400 capitalize">
              Type:{" "}
              {selectedRoom.type.replace(
                "_",
                " "
              )}
            </div>

            {selectedRoom.confidence ===
              "low" && (
              <div className="mt-3 rounded-lg border border-amber-800/80 bg-amber-950/40 p-2.5 font-mono text-xs font-semibold text-amber-300">
                ⚠️ Low AI confidence score.
                Verify boundary vertices.
              </div>
            )}
          </div>
        )}

      {/* =====================================================
          MAIN SVG
      ====================================================== */}

      <div
        className={`h-full w-full transition-all duration-500 ease-out cursor-grab active:cursor-grabbing ${
          is3D
            ? "isometric-view"
            : "flat-view"
        }`}
        style={{
          transform: `${
            is3D
              ? "rotateX(42deg) rotateZ(-22deg)"
              : "rotateX(0deg) rotateZ(0deg)"
          } translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
          transformOrigin:
            "center center",
        }}
      >
        <svg
          viewBox="0 0 1000 800"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <defs>
            {/* GRID */}

            <pattern
              id="dark-floor-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="#1E293B"
                strokeWidth="0.8"
                opacity="0.6"
              />
            </pattern>

            {/* ROUTE GLOW */}

            <filter
              id="dark-route-glow"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur
                stdDeviation="4"
                result="blur"
              />

              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* ROUTE ARROW */}

            <marker
              id="dark-route-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="4"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path
                d="M 0 0 L 8 4 L 0 8 z"
                fill="#14B8A6"
              />
            </marker>

            {/* OCCUPANT SHADOW */}

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
                stdDeviation="2.5"
                floodOpacity="0.4"
              />
            </filter>
          </defs>

          {/* =================================================
              BACKGROUND
          ================================================== */}

          <rect
            x="0"
            y="0"
            width="1000"
            height="800"
            fill="#05070A"
          />

          {showGrid && (
            <rect
              x="0"
              y="0"
              width="1000"
              height="800"
              fill="url(#dark-floor-grid)"
            />
          )}

          {/* =================================================
              BUILDING OUTLINE
          ================================================== */}

          {geometry.buildingOutline &&
            geometry.buildingOutline.length >
              2 && (
              <BuildingOutline
                polygon={
                  geometry.buildingOutline
                }
              />
            )}

          {/* =================================================
              HAZARDS
          ================================================== */}

          {geometry.hazards?.map(
            (hazard) => (
              <HazardMarker
                key={hazard.id}
                hazard={hazard}
              />
            )
          )}

          {/* =================================================
              BACKEND BUILDING CONNECTIONS
          ==================================================
          
              Render BEFORE rooms and routes.
          ================================================== */}

          <g
            pointerEvents="none"
            className="building-connections"
          >
            {connectionItems.map(
              (connection) => {
                const from =
                  geometryPoints.get(
                    connection.from
                  );

                const to =
                  geometryPoints.get(
                    connection.to
                  );

                if (!from || !to) {
                  return null;
                }

                const fromAnchor =
                  getConnectionAnchor(
                    connection.from,
                    to
                  );

                const toAnchor =
                  getConnectionAnchor(
                    connection.to,
                    from
                  );

                const path =
                  createConnectionPath(
                    fromAnchor,
                    toAnchor
                  );

                const midX =
                  (fromAnchor.x +
                    toAnchor.x) /
                  2;

                const midY =
                  (fromAnchor.y +
                    toAnchor.y) /
                  2;

                const blocked =
                  !connection.accessible;

                return (
                  <g
                    key={`connection-${connection.id}`}
                  >
                    {/* separation layer */}

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

                    {/* actual connection */}

                    <path
                      d={path}
                      fill="none"
                      stroke={
                        blocked
                          ? "#EF4444"
                          : "#64748B"
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

                    {/* blocked marker */}

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
          ================================================== */}

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
          ================================================== */}

          {geometry.stairwells.map(
            (stairwell) => (
              <StairwellBlock
                key={stairwell.id}
                stairwell={
                  stairwell
                }
              />
            )
          )}

          {/* =================================================
              DYNAMIC EVACUATION ROUTES
          ================================================== */}

          {routes.map((route) => {
            if (
              !route.path ||
              route.path.length <
                2
            ) {
              return null;
            }

            const pointsStr =
              route.path
                .map(
                  (point) =>
                    `${point.x},${point.y}`
                )
                .join(" ");

            const routeColor =
              route.isRerouted
                ? "#22C55E"
                : "#14B8A6";

            return (
              <g
                key={`route-${route.occupantId}`}
                pointerEvents="none"
              >
                {/* Glow */}

                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={
                    routeColor
                  }
                  strokeWidth="10"
                  strokeOpacity="0.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#dark-route-glow)"
                  vectorEffect="non-scaling-stroke"
                />

                {/* separator */}

                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke="#05070A"
                  strokeWidth="8"
                  strokeOpacity="0.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />

                {/* animated route */}

                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={
                    routeColor
                  }
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="12 7"
                  markerMid="url(#dark-route-arrow)"
                  vectorEffect="non-scaling-stroke"
                  className="route-flow"
                />

                {/* origin */}

                <circle
                  cx={
                    route.path[0]
                      .x
                  }
                  cy={
                    route.path[0]
                      .y
                  }
                  r="6"
                  fill="#0B0F17"
                  stroke={
                    routeColor
                  }
                  strokeWidth="3"
                  vectorEffect="non-scaling-stroke"
                />

                {/* destination */}

                <circle
                  cx={
                    route.path[
                      route.path
                        .length - 1
                    ].x
                  }
                  cy={
                    route.path[
                      route.path
                        .length - 1
                    ].y
                  }
                  r="7"
                  fill={
                    routeColor
                  }
                  stroke="#0B0F17"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />

                {/* reroute label */}

                {route.isRerouted && (
                  <text
                    x={
                      route.path[0]
                        .x
                    }
                    y={
                      route.path[0]
                        .y - 14
                    }
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="900"
                    fontFamily="Inter, sans-serif"
                    fill="#22C55E"
                  >
                    REROUTED
                  </text>
                )}
              </g>
            );
          })}

          {/* =================================================
              DOORS
          ================================================== */}

          {geometry.doors.map(
            (door) => (
              <DoorMarker
                key={door.id}
                door={door}
              />
            )
          )}

          {/* =================================================
              EXITS
          ================================================== */}

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
          ================================================== */}

          {occupants.map(
            (occupant) => {
              const profile =
                profileData[
                  occupant.profile
                ];

              return (
                <g
                  key={
                    occupant.id
                  }
                  pointerEvents="none"
                  filter="url(#occupant-shadow)"
                >
                  <circle
                    cx={
                      occupant.position
                        .x
                    }
                    cy={
                      occupant.position
                        .y
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
                      occupant.position
                        .x
                    }
                    cy={
                      occupant.position
                        .y
                    }
                    r="8"
                    fill={
                      profile.color
                    }
                  />

                  <text
                    x={
                      occupant.position
                        .x
                    }
                    y={
                      occupant.position
                        .y + 4
                    }
                    textAnchor="middle"
                    fontSize={
                      occupant.profile ===
                      "wheelchair"
                        ? "10"
                        : occupant.profile ===
                            "first_responder"
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
                      occupant.position
                        .x + 14
                    }
                    y={
                      occupant.position
                        .y - 9
                    }
                    width="42"
                    height="18"
                    rx="5"
                    fill="white"
                    fillOpacity="0.92"
                  />

                  <text
                    x={
                      occupant.position
                        .x + 35
                    }
                    y={
                      occupant.position
                        .y + 3
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
    </div>
  );
}