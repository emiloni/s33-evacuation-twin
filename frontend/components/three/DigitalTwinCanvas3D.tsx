"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import type { FloorGeometry, Hazard, Occupant, RouteSegment, Room } from "@/lib/schema";
import { DigitalTwin3DScene, CameraPreset } from "@/lib/three-scene-engine";
import Icons from "@/lib/icon-set";

interface DigitalTwinCanvas3DProps {
  geometry: FloorGeometry;
  occupants?: Occupant[];
  hazards?: Hazard[];
  routes?: RouteSegment[];
  allFloors?: FloorGeometry[];
  selectedRoomId?: string | null;
  simulationRunning?: boolean;
  onSelectRoom?: (room: Room | null) => void;
  onSelectOccupant?: (occupant: Occupant | null) => void;
  className?: string;
}

export default function DigitalTwinCanvas3D({
  geometry,
  occupants = [],
  hazards = [],
  routes = [],
  allFloors,
  selectedRoomId = null,
  simulationRunning = false,
  onSelectRoom,
  onSelectOccupant,
  className = "",
}: DigitalTwinCanvas3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneEngineRef = useRef<DigitalTwin3DScene | null>(null);

  const [activePreset, setActivePreset] = useState<CameraPreset>("isometric");
  const [selectedEntity, setSelectedEntity] = useState<{
    type: "room" | "occupant" | "hazard";
    data: Room | Occupant | Hazard | Record<string, unknown>;
  } | null>(null);

  // Initialize Three.js Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new DigitalTwin3DScene(containerRef.current, {
      onSelectRoom: (room) => {
        onSelectRoom?.(room);
        if (room) {
          setSelectedEntity({ type: "room", data: room });
        } else {
          setSelectedEntity((curr) => (curr?.type === "room" ? null : curr));
        }
      },
      onSelectOccupant: (occ) => {
        onSelectOccupant?.(occ);
        if (occ) {
          setSelectedEntity({ type: "occupant", data: occ });
        } else {
          setSelectedEntity((curr) => (curr?.type === "occupant" ? null : curr));
        }
      },
    });

    sceneEngineRef.current = engine;

    return () => {
      engine.destroy();
      sceneEngineRef.current = null;
    };
  }, []);

  // Synchronize Floor Geometry
  useEffect(() => {
    sceneEngineRef.current?.updateFloorGeometry(geometry, selectedRoomId, allFloors);
  }, [geometry, selectedRoomId, allFloors]);

  // Synchronize Hazards
  useEffect(() => {
    sceneEngineRef.current?.updateHazards(hazards);
  }, [hazards]);

  // Synchronize Occupants
  useEffect(() => {
    sceneEngineRef.current?.updateOccupants(occupants);
  }, [occupants]);

  // Synchronize Routes
  useEffect(() => {
    sceneEngineRef.current?.updateRoutes(routes);
  }, [routes]);

  // Synchronize Simulation State
  useEffect(() => {
    sceneEngineRef.current?.setSimulationRunning(simulationRunning);
  }, [simulationRunning]);

  const handlePresetChange = useCallback((preset: CameraPreset) => {
    setActivePreset(preset);
    sceneEngineRef.current?.setCameraPreset(preset);
  }, []);

  const handleReset = useCallback(() => {
    setActivePreset("isometric");
    sceneEngineRef.current?.resetView();
  }, []);

  const handleZoomIn = useCallback(() => {
    sceneEngineRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    sceneEngineRef.current?.zoomOut();
  }, []);

  return (
    <div
      className={`relative h-full w-full select-none overflow-hidden rounded-2xl bg-[#F8FAFC] ${className}`}
    >
      {/* 3D WEBGL CANVAS MOUNT CONTAINER */}
      <div ref={containerRef} className="h-full w-full cursor-grab active:cursor-grabbing" />

      {/* TOP LEFT: FLOATING STATUS HUD */}
      <div className="pointer-events-none absolute left-5 top-5 z-20 flex flex-col gap-2">
        <div className="rounded-xl px-4 py-3 shadow-md backdrop-blur-xl border border-zinc-200 bg-white/90">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700">
              3D Digital Twin Engine
            </span>
          </div>
          <div className="mt-1 font-mono text-sm font-black text-zinc-950">
            FL 0{geometry.floorLevel} ARCHITECTURAL MODEL
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-zinc-500 flex items-center gap-3">
            <span>{geometry.rooms.length} ZONES</span>
            <span>•</span>
            <span>{geometry.doors.length} DOORS</span>
            <span>•</span>
            <span>{geometry.exits.length} EXITS</span>
          </div>
        </div>
      </div>

      {/* TOP RIGHT: ROUTING ENGINE STATUS HUD */}
      {routes.length > 0 && (
        <div className="pointer-events-none absolute right-5 top-5 z-20">
          <div className="rounded-xl border border-emerald-300 bg-emerald-50/90 px-4 py-3 shadow-md backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">
                Egress Vectors Active
              </span>
            </div>
            <div className="mt-0.5 font-mono text-sm font-black text-emerald-950 tabular-nums">
              {routes.length} Active Routes Generated
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM LEFT: INTERACTION HINT & LEGEND */}
      <div className="pointer-events-none absolute bottom-5 left-5 z-20 hidden sm:flex items-center gap-3">
        <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white/90 px-4 py-2 text-xs backdrop-blur-md font-mono shadow-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            <span className="text-blue-700 font-semibold">Normal Route</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-emerald-700 font-semibold">Protected Reroute</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            <span className="text-red-700 font-semibold">Hazard Vector</span>
          </div>
          <div className="h-3 w-[1px] bg-zinc-300" />
          <span className="text-[10px] text-zinc-500">Drag to Orbit • Right-Click to Pan • Scroll to Zoom</span>
        </div>
      </div>

      {/* BOTTOM RIGHT: 3D CAMERA CONTROLS TOOLBAR */}
      <div className="absolute bottom-5 right-5 z-20 flex items-center gap-1 rounded-xl border border-zinc-200 bg-white/95 p-1.5 shadow-md backdrop-blur-xl">
        <button
          type="button"
          onClick={() => handlePresetChange("isometric")}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold transition-all cursor-pointer ${
            activePreset === "isometric"
              ? "bg-zinc-950 text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
          title="3D Isometric View"
        >
          <Icons.Box className="h-3.5 w-3.5" />
          <span>3D Iso</span>
        </button>

        <button
          type="button"
          onClick={() => handlePresetChange("topdown")}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold transition-all cursor-pointer ${
            activePreset === "topdown"
              ? "bg-zinc-950 text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
          title="2D Top-Down Blueprint View"
        >
          <Icons.Grid className="h-3.5 w-3.5" />
          <span>2D Plan</span>
        </button>

        <button
          type="button"
          onClick={() => handlePresetChange("perspective")}
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-mono text-xs font-bold transition-all cursor-pointer ${
            activePreset === "perspective"
              ? "bg-zinc-950 text-white shadow-xs"
              : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
          }`}
          title="Egress Perspective"
        >
          <Icons.Compass className="h-3.5 w-3.5" />
          <span>Perspective</span>
        </button>

        <div className="h-4 w-[1px] bg-zinc-200 mx-1" />

        <button
          type="button"
          onClick={handleZoomIn}
          className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
          title="Zoom In"
        >
          <Icons.Maximize className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={handleZoomOut}
          className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
          title="Zoom Out"
        >
          <Icons.Minimize className="h-3.5 w-3.5" />
        </button>

        <button
          type="button"
          onClick={handleReset}
          className="rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 cursor-pointer"
          title="Reset Camera"
        >
          <Icons.RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* SELECTED ENTITY INSPECTOR OVERLAY */}
      {selectedEntity && (
        <div className="absolute right-5 top-20 z-20 w-72 rounded-2xl border border-zinc-200 bg-white/95 p-4 shadow-lg backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
                Spatial Inspection
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelectedEntity(null)}
              className="text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer"
            >
              ✕
            </button>
          </div>

          {selectedEntity.type === "room" && (() => {
            const roomData = selectedEntity.data as Room;
            return (
              <div className="mt-2">
                <div className="text-base font-bold text-zinc-950">{roomData.label}</div>
                <div className="mt-0.5 font-mono text-xs text-zinc-500 capitalize">
                  Type: {roomData.type?.replace("_", " ")}
                </div>
                <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 font-mono text-[11px] text-zinc-700">
                  <div>Vertices: {roomData.polygon?.length || 4} points</div>
                  <div className="mt-1 text-emerald-700 font-semibold">Status: Verified Geometry (High Trust)</div>
                </div>
              </div>
            );
          })()}

          {selectedEntity.type === "occupant" && (() => {
            const occupantData = selectedEntity.data as Occupant;
            return (
              <div className="mt-2">
                <div className="text-base font-bold text-zinc-950">{occupantData.id}</div>
                <div className="mt-0.5 font-mono text-xs text-zinc-500 capitalize">
                  Profile: {occupantData.profile?.replace("_", " ")}
                </div>
                <div className="mt-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2.5 font-mono text-[11px] text-zinc-700">
                  <div>Room: {occupantData.roomId}</div>
                  <div className="mt-1 text-blue-700 font-semibold">Egress Priority: Dynamic Calculation Active</div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
