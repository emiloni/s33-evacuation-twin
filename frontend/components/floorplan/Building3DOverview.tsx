"use client";

import { useMemo, useState } from "react";

type BuildingNode = {
  id: string;
  x: number;
  y: number;
  type: string;
  floor: number;
  label: string;
};

type BuildingEdge = {
  from: string;
  to: string;
};

type Hazard = {
  location: string;
};

interface Building3DOverviewProps {
  nodes: BuildingNode[];
  edges: BuildingEdge[];
  floors: number[];
  selectedFloor: number;
  route: string[];
  hazards: Hazard[];
  onFloorSelect: (floor: number) => void;
}

const FLOOR_WIDTH = 560;
const FLOOR_HEIGHT = 230;
const FLOOR_GAP = 105;

function pointForNode(
  node: BuildingNode,
  floorNodes: BuildingNode[],
  rotate: boolean
) {
  const xValues = floorNodes.map((item) => item.x);
  const yValues = floorNodes.map((item) => item.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);
  const xRange = Math.max(maxX - minX, 1);
  const yRange = Math.max(maxY - minY, 1);
  const surfaceX = ((node.x - minX) / xRange) * 400;
  const surfaceY = ((node.y - minY) / yRange) * 120;
  const x = 150 + (rotate ? 400 - surfaceX : surfaceX) * 0.78 - surfaceY * 0.68;
  const y = 50 + surfaceX * 0.25 + surfaceY * 0.25;

  return { x, y };
}

export default function Building3DOverview({
  nodes,
  edges,
  floors,
  selectedFloor,
  route,
  hazards,
  onFloorSelect,
}: Building3DOverviewProps) {
  const [rotate, setRotate] = useState(false);

  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes]
  );
  const hazardLocations = useMemo(
    () => new Set(hazards.map((hazard) => hazard.location)),
    [hazards]
  );

  const orderedFloors = [...floors].sort((a, b) => b - a);
  const viewHeight = Math.max(520, orderedFloors.length * FLOOR_GAP + 170);

  return (
    <div className="relative h-full min-h-[620px] overflow-hidden rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_50%_0%,#e0f2fe,transparent_42%),linear-gradient(180deg,#f8fafc_0%,#e2e8f0_100%)] p-4">
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/75 to-transparent" />

      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-700">
            Spatial overview
          </div>
          <h3 className="mt-1 text-lg font-black text-slate-900">
            3D Building Stack
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Isometric overview of floors, exits, hazards, and the active route.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRotate((current) => !current)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-sky-400 hover:text-sky-700"
          aria-pressed={rotate}
        >
          {rotate ? "↶ Reset view" : "↷ Rotate view"}
        </button>
      </div>

      <svg
        viewBox={`0 0 700 ${viewHeight}`}
        className="relative z-10 mt-3 h-[520px] w-full"
        role="img"
        aria-label="Interactive isometric building overview"
      >
        <defs>
          <filter id="floor-shadow" x="-20%" y="-20%" width="140%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#0f172a" floodOpacity="0.18" />
          </filter>
          <linearGradient id="floor-surface" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
        </defs>

        {orderedFloors.map((floor, index) => {
          const floorNodes = nodes.filter((node) => node.floor === floor);
          const floorNodeMap = new Map(floorNodes.map((node) => [node.id, node]));
          const y = 45 + index * FLOOR_GAP;
          const active = floor === selectedFloor;
          const points = new Map(
            floorNodes.map((node) => [node.id, pointForNode(node, floorNodes, rotate)])
          );

          return (
            <g
              key={floor}
              onClick={() => onFloorSelect(floor)}
              className="cursor-pointer"
              aria-label={`Show floor ${floor}`}
            >
              <polygon
                points={`70,${y + 100} 385,${y + 20} 650,${y + 100} 335,${y + 180}`}
                fill="url(#floor-surface)"
                stroke={active ? "#0284c7" : "#94a3b8"}
                strokeWidth={active ? "4" : "2"}
                filter="url(#floor-shadow)"
              />
              <polygon
                points={`335,${y + 180} 650,${y + 100} 650,${y + 124} 335,${y + 204}`}
                fill={active ? "#0369a1" : "#64748b"}
                opacity="0.72"
              />
              <polygon
                points={`70,${y + 100} 335,${y + 180} 335,${y + 204} 70,${y + 124}`}
                fill="#475569"
                opacity="0.58"
              />
              <text x="112" y={y + 116} fontSize="13" fontWeight="800" fill="#0f172a">
                FLOOR {floor}
              </text>
              <text x="112" y={y + 136} fontSize="10" fill="#475569">
                {floorNodes.length} mapped points
              </text>

              {edges.map((edge) => {
                const from = floorNodeMap.get(edge.from);
                const to = floorNodeMap.get(edge.to);
                const fromPoint = points.get(edge.from);
                const toPoint = points.get(edge.to);

                if (!from || !to || !fromPoint || !toPoint) {
                  return null;
                }

                const onRoute = route.includes(edge.from) && route.includes(edge.to);
                return (
                  <line
                    key={`${edge.from}-${edge.to}`}
                    x1={fromPoint.x + 65}
                    y1={fromPoint.y + y}
                    x2={toPoint.x + 65}
                    y2={toPoint.y + y}
                    stroke={onRoute ? "#059669" : "#94a3b8"}
                    strokeWidth={onRoute ? "5" : "2"}
                    strokeLinecap="round"
                    strokeDasharray={onRoute ? "8 5" : undefined}
                    opacity="0.9"
                  />
                );
              })}

              {floorNodes.map((node) => {
                const point = points.get(node.id)!;
                const onRoute = route.includes(node.id);
                const hazard = hazardLocations.has(node.id);
                const isExit = node.type === "exit";
                const isService = ["stairs", "elevator", "ramp"].includes(node.type);
                const fill = hazard ? "#dc2626" : isExit ? "#2563eb" : isService ? "#8b5cf6" : node.type === "corridor" ? "#10b981" : "#f5efd5";
                const height = isService ? 26 : isExit ? 14 : node.type === "corridor" ? 10 : 21;
                const width = isService ? 20 : isExit ? 13 : node.type === "corridor" ? 27 : 23;
                const topY = point.y + y - height;

                return (
                  <g key={node.id}>
                    {onRoute && <ellipse cx={point.x + 65} cy={point.y + y + 5} rx="32" ry="15" fill="#34d399" opacity="0.24" />}
                    <polygon points={`${point.x + 65 - width},${topY + 8} ${point.x + 65},${topY} ${point.x + 65 + width},${topY + 8} ${point.x + 65},${topY + 16}`} fill={fill} stroke="#475569" strokeWidth="1.5" />
                    <polygon points={`${point.x + 65 - width},${topY + 8} ${point.x + 65},${topY + 16} ${point.x + 65},${point.y + y + 12} ${point.x + 65 - width},${point.y + y + 4}`} fill="#475569" opacity="0.65" />
                    <polygon points={`${point.x + 65},${topY + 16} ${point.x + 65 + width},${topY + 8} ${point.x + 65 + width},${point.y + y + 4} ${point.x + 65},${point.y + y + 12}`} fill="#334155" opacity="0.7" />
                    {(isExit || hazard || onRoute) && (
                      <text x={point.x + 65} y={topY + 11} textAnchor="middle" fontSize="8" fontWeight="800" fill="#0f172a">
                        {hazard ? "HAZARD" : isExit ? "EXIT" : node.label || node.id}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          );
        })}

        {route.slice(0, -1).map((nodeId, index) => {
          const from = nodeMap.get(nodeId);
          const to = nodeMap.get(route[index + 1]);
          if (!from || !to || from.floor === to.floor) {
            return null;
          }
          const fromIndex = orderedFloors.indexOf(from.floor);
          const toIndex = orderedFloors.indexOf(to.floor);
          const fromNodes = nodes.filter((node) => node.floor === from.floor);
          const toNodes = nodes.filter((node) => node.floor === to.floor);
          const fromPoint = pointForNode(from, fromNodes, rotate);
          const toPoint = pointForNode(to, toNodes, rotate);
          const fromY = 45 + fromIndex * FLOOR_GAP;
          const toY = 45 + toIndex * FLOOR_GAP;

          return (
            <line
              key={`${from.id}-${to.id}`}
              x1={fromPoint.x + 65}
              y1={fromPoint.y + fromY}
              x2={toPoint.x + 65}
              y2={toPoint.y + toY}
              stroke="#059669"
              strokeWidth="4"
              strokeDasharray="7 5"
              opacity="0.95"
            />
          );
        })}
      </svg>

      <div className="relative z-10 flex flex-wrap gap-x-4 gap-y-2 text-[11px] font-semibold text-slate-600">
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" />Route</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />Exit</span>
        <span><i className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />Hazard</span>
        <span>Click a floor to inspect its plan.</span>
      </div>
    </div>
  );
}
