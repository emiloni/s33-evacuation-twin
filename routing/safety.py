from typing import List, Dict, Any


def evaluate_sensor_state(
    sensors: List[Dict[str, Any]],
) -> Dict[str, Any]:

    unavailable = [
        sensor["id"]
        for sensor in sensors
        if not sensor["available"]
    ]

    if unavailable:
        return {
            "mode": "conservative",
            "confidence": "low",
            "advisory": True,
            "unavailable_sensors": unavailable,
            "message": (
                "One or more sensors are unavailable. "
                "Evacuation route is advisory and "
                "uses conservative assumptions."
            ),
        }

    return {
        "mode": "normal",
        "confidence": "high",
        "advisory": False,
        "unavailable_sensors": [],
        "message": (
            "Sensor data is available. "
            "Route confidence is high."
        ),
    }

from typing import List, Dict, Any, Set
import math


def evaluate_sensor_state(
    sensors: List[Dict[str, Any]],
) -> Dict[str, Any]:

    unavailable = [
        sensor["id"]
        for sensor in sensors
        if not sensor.get("available", True)
    ]

    if unavailable:
        return {
            "mode": "conservative",
            "confidence": "low",
            "advisory": True,
            "unavailable_sensors": unavailable,
            "message": (
                "One or more sensors are unavailable. "
                "Evacuation route is advisory and "
                "uses conservative assumptions."
            ),
        }

    return {
        "mode": "normal",
        "confidence": "high",
        "advisory": False,
        "unavailable_sensors": [],
        "message": (
            "Sensor data is available. "
            "Route confidence is high."
        ),
    }


# =========================================================
# HAZARD SAFETY
# =========================================================


def get_active_fire_sensors(
    sensors: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:

    fires = []

    for sensor in sensors:

        sensor_type = (
            sensor.get("type")
            or sensor.get("hazard_type")
            or sensor.get("hazard")
        )

        if sensor_type != "fire":
            continue

        if not sensor.get("available", True):
            continue

        if sensor.get("active", True) is False:
            continue

        if (
            sensor.get("x") is None
            or sensor.get("y") is None
        ):
            continue

        fires.append(sensor)

    return fires


def is_point_unsafe(
    x: float,
    y: float,
    sensors: List[Dict[str, Any]],
    safety_radius: float = 200.0,
) -> bool:

    fires = get_active_fire_sensors(
        sensors
    )

    for fire in fires:

        fire_x = float(
            fire["x"]
        )

        fire_y = float(
            fire["y"]
        )

        distance = math.sqrt(
            (x - fire_x) ** 2
            + (y - fire_y) ** 2
        )

        if distance <= safety_radius:
            return True

    return False


def get_hazardous_nodes(
    graph,
    sensors: List[Dict[str, Any]],
    safety_radius: float = 200.0,
) -> Set[str]:

    hazardous_nodes = set()

    for node_id, data in graph.nodes(
        data=True
    ):

        x = data.get("x")
        y = data.get("y")

        if x is None or y is None:
            continue

        if is_point_unsafe(
            float(x),
            float(y),
            sensors,
            safety_radius,
        ):
            hazardous_nodes.add(
                node_id
            )

    return hazardous_nodes