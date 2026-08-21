import type {
  FloorGeometry,
  Hazard,
  Occupant,
  RouteSegment,
} from "./schema";

export interface EvacuationTwinResponse {
  success: boolean;
  floor: FloorGeometry;
  occupants: Occupant[];
  hazards: Hazard[];
  routes: RouteSegment[];
  message?: string;
  error?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "";

export async function parseFloorPlan(
  file: File
): Promise<EvacuationTwinResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const endpoint = API_BASE ? `${API_BASE}/api/parse-floor-plan/` : "/api/parse-floor-plan";

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = "Failed to process floor plan.";
    try {
      const errorJson = await response.json();
      if (errorJson.error) errorDetail = errorJson.error;
    } catch {
      const rawText = await response.text();
      if (rawText) errorDetail = rawText;
    }

    throw new Error(errorDetail);
  }

  return response.json();
}