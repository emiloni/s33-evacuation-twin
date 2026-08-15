from typing import List, Dict, Any


def detect_hazards(
    sensors: List[Dict[str, Any]]
) -> Dict[str, Any]:

    blocked_nodes = set()
    hazard_map = {}

    for sensor in sensors:

        # Sensor failure does not directly create a hazard.
        if not sensor["available"]:
            continue

        sensor_type = sensor["type"]
        value = sensor["value"]
        location = sensor["location"]

        hazard_type = None
        severity = None

        # Temperature threshold
        if (
            sensor_type == "temperature"
            and value >= 50
        ):
            hazard_type = "fire"
            severity = "high"

        # Smoke threshold
        elif (
            sensor_type == "smoke"
            and value >= 30
        ):
            hazard_type = "fire"
            severity = "high"

        # Closed exit
        elif (
            sensor_type == "door"
            and value == "closed"
        ):
            hazard_type = "closed_exit"
            severity = "high"

        if hazard_type is None:
            continue

        blocked_nodes.add(location)

        key = (hazard_type, location)

        # Keep only one hazard record.
        if key not in hazard_map:
            hazard_map[key] = {
                "type": hazard_type,
                "location": location,
                "source_sensors": [],
                "severity": severity,
            }

        hazard_map[key]["source_sensors"].append(
            sensor["id"]
        )

    return {
        "blocked_nodes": blocked_nodes,
        "hazards": list(hazard_map.values()),
    }