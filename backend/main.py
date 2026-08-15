from typing import List, Optional

from fastapi import (
    FastAPI,
    File,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from routing.dijkstra import (
    find_evacuation_route,
)
from routing.graph import build_graph
from routing.safety import (
    evaluate_sensor_state,
)
from simulation.hazard_detector import (
    detect_hazards,
)

from .building_schema import (
    BuildingDataset,
)
from .building_service import (
    activate_building,
)


app = FastAPI(
    title="S33 Evacuation Digital Twin API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SensorInput(BaseModel):
    id: str
    type: str
    location: str
    value: object
    available: bool = True


class EvacuationRequest(BaseModel):
    start: str
    destination: Optional[str] = None
    mobility: str = "normal"
    sensors: List[SensorInput] = Field(
        default_factory=list
    )


@app.get("/")
def root():
    return {
        "project": (
            "S33 Evacuation Digital Twin"
        ),
        "status": "running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": (
            "s33-evacuation-digital-twin"
        ),
    }


@app.get("/api/v1/building")
def get_building():

    graph = build_graph()

    nodes = []

    for node_id, data in graph.nodes(
        data=True
    ):
        nodes.append({
            "id": node_id,
            "x": data.get("x", 0),
            "y": data.get("y", 0),
            "type": data.get(
                "type",
                "node"
            ),
            "floor": data.get(
                "floor",
                1
            ),
            "label": data.get(
                "label",
                node_id
            ),
        })

    edges = []

    for u, v, data in graph.edges(
        data=True
    ):
        edges.append({
            "from": u,
            "to": v,
            "weight": data.get(
                "weight",
                1
            ),
            "type": data.get(
                "type",
                "corridor"
            ),
            "accessible": data.get(
                "accessible",
                True
            ),
        })

    return {
        "nodes": nodes,
        "edges": edges,
    }


@app.post("/api/v1/building")
def upload_building(
    dataset: BuildingDataset,
):

    try:

        validation = activate_building(
            dataset
        )

        return {
            "success": True,
            "message": (
                "Building dataset "
                "loaded successfully."
            ),
            "building": dataset.building,
            "validation": validation,
        }

    except ValueError as error:

        return {
            "success": False,
            "message": str(error),
        }


@app.post(
    "/api/v1/building/upload"
)
async def upload_building_file(
    file: UploadFile = File(...)
):

    if not file.filename:
        return {
            "success": False,
            "message": "File name is required.",
        }

    if not file.filename.lower().endswith(
        ".json"
    ):
        return {
            "success": False,
            "message": (
                "Only JSON building datasets "
                "are supported."
            ),
        }

    try:

        content = await file.read()

        import json

        raw_data = json.loads(
            content.decode("utf-8")
        )

        dataset = BuildingDataset(
            **raw_data
        )

        validation = activate_building(
            dataset
        )

        return {
            "success": True,
            "message": (
                "Building dataset "
                "uploaded successfully."
            ),
            "building": dataset.building,
            "validation": validation,
        }

    except Exception as error:

        return {
            "success": False,
            "message": str(error),
        }


def calculate_evacuation(
    start: str,
    destination: Optional[str],
    mobility: str,
    sensors: List[dict],
):

    safety = evaluate_sensor_state(
        sensors
    )

    hazard_result = detect_hazards(
        sensors
    )

    blocked_nodes = hazard_result[
        "blocked_nodes"
    ]

    hazards = hazard_result[
        "hazards"
    ]

    route = find_evacuation_route(
        start=start,
        destination=destination,
        mobility=mobility,
        blocked_nodes=blocked_nodes,
    )

    selected_exit = route.get(
        "exit",
        destination,
    )

    route_path = route.get(
        "route",
        route.get("path", []),
    )

    return {
        "success": route["success"],
        "route": route_path,
        "distance": route["distance"],
        "start": start,
        "destination": selected_exit,
        "mobility": mobility,
        "hazards": hazards,
        "blocked_nodes": list(
            blocked_nodes
        ),
        "mode": safety["mode"],
        "confidence": safety[
            "confidence"
        ],
        "advisory": safety[
            "advisory"
        ],
        "message": (
            safety["message"]
            if route["success"]
            else route["error"]
        ),
    }


@app.post(
    "/api/v1/evacuation/route"
)
def calculate_route(
    request: EvacuationRequest,
):

    sensors = [
        sensor.dict()
        for sensor in request.sensors
    ]

    return calculate_evacuation(
        start=request.start,
        destination=request.destination,
        mobility=request.mobility,
        sensors=sensors,
    )


@app.websocket(
    "/ws/evacuation/"
    "{start}/{destination}/{mobility}"
)
async def evacuation_websocket(
    websocket: WebSocket,
    start: str,
    destination: str,
    mobility: str,
):

    await websocket.accept()

    try:

        await websocket.send_json({
            "type": "connection",
            "status": "connected",
            "message": (
                "S33 realtime evacuation "
                "connection established."
            ),
        })

        while True:

            data = (
                await websocket
                .receive_json()
            )

            sensors = data.get(
                "sensors",
                [],
            )

            actual_destination = (
                None
                if destination == "AUTO"
                else destination
            )

            result = calculate_evacuation(
                start=start,
                destination=(
                    actual_destination
                ),
                mobility=mobility,
                sensors=sensors,
            )

            await websocket.send_json({
                "type": "route_update",
                "data": result,
            })

    except WebSocketDisconnect:

        print(
            "Evacuation WebSocket "
            "disconnected:",
            start,
            destination,
            mobility,
        )