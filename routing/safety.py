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