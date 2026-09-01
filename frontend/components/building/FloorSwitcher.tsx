import React from "react";

interface FloorSwitcherProps {
  selectedFloor: number | "ALL";
  onSelectFloor: (floor: number | "ALL") => void;
  floors?: number[];
}

export default function FloorSwitcher({
  selectedFloor,
  onSelectFloor,
  floors = [1, 2],
}: FloorSwitcherProps) {
  const floorLabels: Record<number, string> = {
    1: "FL 01 (G)",
    2: "FL 02 (1st)",
    3: "FL 03 (2nd)",
    4: "FL 04 (3rd)",
  };

  return (
    <div className="inline-flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 shadow-inner font-mono text-xs">
      {/* ALL FLOORS button */}
      <button
        type="button"
        onClick={() => onSelectFloor("ALL")}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
          selectedFloor === "ALL"
            ? "bg-slate-800 text-slate-100 shadow-sm border border-slate-700"
            : "text-slate-400 hover:text-slate-200"
        }`}
        aria-pressed={selectedFloor === "ALL"}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            selectedFloor === "ALL" ? "bg-emerald-400" : "bg-slate-600"
          }`}
        />
        <span>ALL</span>
      </button>

      {/* Individual floor buttons */}
      {floors.map((floorNum) => {
        const isSelected = selectedFloor === floorNum;
        const label = floorLabels[floorNum] || `FL 0${floorNum}`;

        return (
          <button
            key={floorNum}
            type="button"
            onClick={() => onSelectFloor(floorNum)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer ${
              isSelected
                ? "bg-slate-800 text-slate-100 shadow-sm border border-slate-700"
                : "text-slate-400 hover:text-slate-200"
            }`}
            aria-pressed={isSelected}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isSelected ? "bg-emerald-400" : "bg-slate-600"
              }`}
            />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
