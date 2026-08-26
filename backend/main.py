import base64
import json
import os
import re
from typing import Any

import requests
from dotenv import load_dotenv
load_dotenv()
from typing import List, Optional
from backend.auth.security import (
    create_access_token,
)
from backend.auth.dependencies import get_current_user
from fastapi import (
    FastAPI,
    File,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
    Depends,
    HTTPException,
)

import json
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

from pydantic import BaseModel, Field
from .ai.floorplan import analyze_floorplan

# =========================================================
# AUTHENTICATION
# =========================================================

from backend.auth.database import (
    Base,
    engine,
    get_db,
)

from backend.auth.models import (
    User,
    SavedSimulation,
    SavedBuilding,
)
from backend.auth.schemas import (
    SignupRequest,
    LoginRequest,
    UserResponse,
)


# =========================================================
# EXISTING S33 ROUTING / SIMULATION
# =========================================================

from routing.dijkstra import (
    find_evacuation_route,
)

from routing.graph import (
    build_graph,
    load_json,
)

from routing.building_store import (
    get_active_building,
)

from routing.safety import (
    evaluate_sensor_state,
)

from routing.occupancy import (
    build_occupancy_map,
)

from simulation.hazard_detector import (
    detect_hazards,
)


# =========================================================
# BUILDING SERVICES
# =========================================================

from .building_schema import (
    BuildingDataset,
)

from .building_service import (
    activate_building,
)


# =========================================================
# DATABASE INITIALIZATION
# =========================================================

Base.metadata.create_all(
    bind=engine
)


# =========================================================
# PASSWORD HASHING
# =========================================================

from passlib.context import CryptContext


pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


def hash_password(
    password: str,
) -> str:
    return pwd_context.hash(
        password
    )


def verify_password(
    plain_password: str,
    hashed_password: str,
) -> bool:
    return pwd_context.verify(
        plain_password,
        hashed_password,
    )


# =========================================================
# FASTAPI APPLICATION
# =========================================================

app = FastAPI(
    title="S33 Evacuation Digital Twin API",
    version="1.0.0",
)


# =========================================================
# CORS
# =========================================================

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


# =========================================================
# AUTHENTICATION ENDPOINTS
# =========================================================

@app.post(
    "/api/v1/auth/signup",
    response_model=UserResponse,
)
def signup(
    request: SignupRequest,
    db: Session = Depends(get_db),
):
    existing_user = (
        db.query(User)
        .filter(
            User.email == request.email.lower()
        )
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email is already registered.",
        )

    user = User(
        name=request.name.strip(),
        email=request.email.lower(),
        password_hash=hash_password(
            request.password
        ),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return user


@app.post(
    "/api/v1/auth/login"
)
def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(
            User.email == request.email.lower()
        )
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    if not verify_password(
        request.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )
    access_token = create_access_token(
        user_id=user.id,
        email=user.email,
    )

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    }
@app.post(
    "/api/v1/ai/analyze-floorplan"
)
async def analyze_floorplan_file(
    file: UploadFile = File(...)
):
    if not file.filename:
        return {
            "success": False,
            "message": "File name is required.",
        }

    allowed_extensions = {
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
    }

    filename = file.filename.lower()

    if not any(
        filename.endswith(ext)
        for ext in allowed_extensions
    ):
        return {
            "success": False,
            "message": (
                "Please upload a PNG, JPG, "
                "JPEG or WEBP floor plan."
            ),
        }

    try:
        content = await file.read()

        result = analyze_floorplan(
            content,
            file.filename,
        )

        return {
            "success": True,
            "message": (
                "Floor plan analyzed successfully."
            ),
            "building": result["building"],
            "nodes": result["nodes"],
            "edges": result["edges"],
            "analysis": result["analysis"],
        }

    except Exception as error:

        print(
            "AI floor-plan analysis error:",
            error,
        )

        return {
            "success": False,
            "message": str(error),
        }  


# =========================================================
# REQUEST SCHEMAS
# =========================================================

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


# =========================================================
# BASIC ENDPOINTS
# =========================================================

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

@app.get("/api/v1/auth/me")
def get_me(
    current_user: User = Depends(
        get_current_user
    ),
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
    }

# =========================================================
# SAVED SIMULATIONS
# =========================================================

@app.post("/api/v1/simulations")
def save_simulation(
    data: dict,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    simulation = SavedSimulation(
        user_id=current_user.id,
        building_name=data.get(
            "building_name"
        ),
        start_node=data.get(
            "start_node",
            "",
        ),
        destination=data.get(
            "destination"
        ),
        mobility=data.get(
            "mobility",
            "normal",
        ),
        scenario=data.get(
            "scenario",
            "normal",
        ),
        route=json.dumps(
            data.get(
                "route",
                [],
            )
        ),
        hazards=json.dumps(
            data.get(
                "hazards",
                [],
            )
        ),
        confidence=data.get(
            "confidence"
        ),
        mode=data.get(
            "mode"
        ),
    )

    db.add(simulation)
    db.commit()
    db.refresh(simulation)

    return {
        "success": True,
        "message": "Simulation saved successfully.",
        "simulation": {
            "id": simulation.id,
            "created_at": simulation.created_at,
        },
    }


@app.get("/api/v1/simulations")
def get_my_simulations(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    simulations = (
        db.query(SavedSimulation)
        .filter(
            SavedSimulation.user_id
            == current_user.id
        )
        .order_by(
            SavedSimulation.created_at.desc()
        )
        .all()
    )

    return [
        {
            "id": simulation.id,
            "building_name": simulation.building_name,
            "start_node": simulation.start_node,
            "destination": simulation.destination,
            "mobility": simulation.mobility,
            "scenario": simulation.scenario,
            "route": json.loads(
                simulation.route
            ),
            "hazards": json.loads(
                simulation.hazards
            )
            if simulation.hazards
            else [],
            "confidence": simulation.confidence,
            "mode": simulation.mode,
            "created_at": simulation.created_at,
        }
        for simulation in simulations
    ]
# =========================================================
# BUILDING
# =========================================================

@app.get("/api/v1/building")
def get_building(
    current_user: User = Depends(
        get_current_user
    ),
):
    """Return the currently active building (nodes + edges)."""
    active = get_active_building()

    if active is not None:
        return {
            "nodes": active.get("nodes", []),
            "edges": active.get("edges", []),
        }

    # Fallback: load demo building
    demo = load_json("demo_building.json")
    return {
        "nodes": demo.get("nodes", []),
        "edges": demo.get("edges", []),
    }


# =========================================================
# BUILDING DATASET
# =========================================================

@app.post(
    "/api/v1/building"
)
def upload_building(
    dataset: BuildingDataset,
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    try:

        validation = activate_building(
            dataset
        )

        # Convert Pydantic dataset to JSON
        try:
            building_data = dataset.model_dump(
                mode="json"
            )
        except AttributeError:
            building_data = dataset.dict()

        saved_building = SavedBuilding(
            user_id=current_user.id,
            name="Uploaded Building",
            building_json=json.dumps(
                building_data
            ),
        )

        db.add(saved_building)
        db.commit()
        db.refresh(saved_building)

        return {
            "success": True,
            "message": (
                "Building dataset "
                "loaded and saved successfully."
            ),
            "building_id": saved_building.id,
            "building": dataset.building,
            "validation": validation,
        }

    except ValueError as error:

        return {
            "success": False,
            "message": str(error),
        }


# =========================================================
# USER BUILDINGS
# =========================================================

@app.get("/api/v1/buildings")
def get_my_buildings(
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    buildings = (
        db.query(SavedBuilding)
        .filter(
            SavedBuilding.user_id
            == current_user.id
        )
        .order_by(
            SavedBuilding.created_at.desc()
        )
        .all()
    )

    return [
        {
            "id": building.id,
            "name": building.name,
            "created_at": building.created_at,
        }
        for building in buildings
    ]


@app.post(
    "/api/v1/building/upload"
)
async def upload_building_file(
    file: UploadFile = File(...),
    current_user: User = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):

    if not file.filename:
        return {
            "success": False,
            "message": (
                "File name is required."
            ),
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

        raw_data = json.loads(
            content.decode("utf-8")
        )

        dataset = BuildingDataset(
            **raw_data
        )

        validation = activate_building(
            dataset
        )

        saved_building = SavedBuilding(
            user_id=current_user.id,
            name=file.filename,
            building_json=json.dumps(
                raw_data
            ),
        )

        db.add(saved_building)
        db.commit()
        db.refresh(saved_building)

        return {
            "success": True,
            "message": (
                "Building dataset "
                "uploaded and saved successfully."
            ),
            "building_id": saved_building.id,
            "building": dataset.building,
            "validation": validation,
        }

    except Exception as error:

        db.rollback()

        return {
            "success": False,
            "message": str(error),
        }

# =========================================================
# EVACUATION CALCULATION
# =========================================================

def calculate_evacuation(
    start: str,
    destination: Optional[str],
    mobility: str,
    sensors: List[dict],
):

    # -----------------------------------------------------
    # Sensor safety state
    # -----------------------------------------------------

    safety = evaluate_sensor_state(
        sensors
    )

    # -----------------------------------------------------
    # Detect hazards
    # -----------------------------------------------------

    hazard_result = detect_hazards(
        sensors
    )

    blocked_nodes = (
        hazard_result[
            "blocked_nodes"
        ]
    )

    hazards = (
        hazard_result[
            "hazards"
        ]
    )

    # -----------------------------------------------------
    # Build occupancy map
    # -----------------------------------------------------

    occupancy = build_occupancy_map(
        sensors
    )

    # -----------------------------------------------------
    # Calculate evacuation route
    # -----------------------------------------------------

    route = find_evacuation_route(
        start=start,
        destination=destination,
        mobility=mobility,
        blocked_nodes=blocked_nodes,
        occupancy=occupancy,
    )

    selected_exit = route.get(
        "exit",
        destination,
    )

    route_path = route.get(
        "route",
        route.get(
            "path",
            [],
        ),
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

        "occupancy": occupancy,

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


# =========================================================
# EVACUATION ROUTE API
# =========================================================

@app.post(
    "/api/v1/evacuation/route"
)
def calculate_route(
    request: EvacuationRequest,
):

    sensors = [
        sensor.model_dump()
        for sensor in request.sensors
    ]

    return calculate_evacuation(
        start=request.start,
        destination=request.destination,
        mobility=request.mobility,
        sensors=sensors,
    )


# =========================================================
# REALTIME EVACUATION WEBSOCKET
# =========================================================

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

        await websocket.send_json(
            {
                "type": "connection",
                "status": "connected",
                "message": (
                    "S33 realtime evacuation "
                    "connection established."
                ),
            }
        )

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

            await websocket.send_json(
                {
                    "type": "route_update",
                    "data": result,
                }
            )

    except WebSocketDisconnect:

        print(
            "Evacuation WebSocket "
            "disconnected:",
            start,
            destination,
            mobility,
        )
@app.post("/api/v1/building/ai-parse")
async def ai_parse_floorplan(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        if not file.filename:
            return {
                "success": False,
                "message": "File name is required.",
            }

        allowed_extensions = {
            ".png",
            ".jpg",
            ".jpeg",
            ".webp",
        }

        extension = (
            "." + file.filename.lower().rsplit(".", 1)[-1]
            if "." in file.filename
            else ""
        )

        if extension not in allowed_extensions:
            return {
                "success": False,
                "message": (
                    "Only PNG, JPG, JPEG and WEBP "
                    "floor plans are supported."
                ),
            }

        content = await file.read()

        result = analyze_floorplan(
            content,
            file.filename,
        )

        dataset = BuildingDataset(
            building=result["building"],
            nodes=result["nodes"],
            edges=result["edges"],
        )

        validation = activate_building(
            dataset
        )

        building_data = dataset.model_dump(
            mode="json"
        )

        saved_building = SavedBuilding(
            user_id=current_user.id,
            name=f"AI - {file.filename}",
            building_json=json.dumps(
                building_data
            ),
        )

        db.add(saved_building)
        db.commit()
        db.refresh(saved_building)

        return {
            "success": True,
            "message": "Floor plan analyzed successfully.",
            "building": building_data,
            "analysis": result.get(
                "analysis",
                {}
            ),
            "validation": validation,
            "saved_building_id": saved_building.id,
        }

    except Exception as error:
        db.rollback()

        return {
            "success": False,
            "message": str(error),
        }