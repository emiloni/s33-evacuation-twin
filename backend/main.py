from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from routing.dijkstra import find_route
from routing.safety import evaluate_sensor_state
from simulation.hazard_detector import detect_hazards


app = FastAPI(
    title="S33 Evacuation Digital Twin API",
    version="1.0.0",
)


# ============================================================
# Request Models
# ============================================================

class SensorInput(BaseModel):
    id: str
    type: str
    location: str
    value: object
    available: bool = True


class EvacuationRequest(BaseModel):
    start: str
    destination: str
    mobility: str = "normal"
    sensors: List[SensorInput] = Field(default_factory=list)


# ============================================================
# Health Check
# ============================================================

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "s33-evacuation-digital-twin",
    }


# ============================================================
# Evacuation Route
# ============================================================

@app.post("/api/v1/evacuation/route")
def calculate_evacuation_route(
    request: EvacuationRequest,
):
    # Convert Pydantic models to dictionaries.
    sensors = [
        sensor.dict()
        for sensor in request.sensors
    ]

    # --------------------------------------------------------
    # 1. Evaluate sensor availability
    # --------------------------------------------------------

    safety = evaluate_sensor_state(
        sensors
    )

    # --------------------------------------------------------
    # 2. Detect hazards
    # --------------------------------------------------------

    hazard_result = detect_hazards(
        sensors
    )

    blocked_nodes = hazard_result[
        "blocked_nodes"
    ]

    hazards = hazard_result[
        "hazards"
    ]

    # --------------------------------------------------------
    # 3. Calculate route using NetworkX
    # --------------------------------------------------------

    route = find_route(
        start=request.start,
        destination=request.destination,
        mobility=request.mobility,
        blocked_nodes=blocked_nodes,
    )

    # --------------------------------------------------------
    # 4. Return unified S33 response
    # --------------------------------------------------------

    return {
        "success": route["success"],

        "route": route["path"],

        "distance": route["distance"],

        "start": request.start,

        "destination": request.destination,

        "mobility": request.mobility,

        "hazards": hazards,

        "blocked_nodes": list(blocked_nodes),

        "mode": safety["mode"],

        "confidence": safety["confidence"],

        "advisory": safety["advisory"],

        "message": (
            safety["message"]
            if route["success"]
            else route["error"]
        ),
    }