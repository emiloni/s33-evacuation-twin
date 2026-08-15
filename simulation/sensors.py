from typing import Dict, Any


SENSOR_TYPES = {
    "temperature",
    "smoke",
    "occupancy",
    "door",
}


def create_sensor(
    sensor_id: str,
    sensor_type: str,
    location: str,
    value: Any,
    available: bool = True,
) -> Dict[str, Any]:

    if sensor_type not in SENSOR_TYPES:
        raise ValueError(
            f"Unsupported sensor type: {sensor_type}"
        )

    return {
        "id": sensor_id,
        "type": sensor_type,
        "location": location,
        "value": value,
        "available": available,
    }


def sensor_is_safe(sensor: Dict[str, Any]) -> bool:
    """
    Basic MVP sensor interpretation.

    This does NOT calculate evacuation routes.
    It only determines whether the sensor reports
    a potentially unsafe condition.
    """

    if not sensor["available"]:
        return False

    sensor_type = sensor["type"]
    value = sensor["value"]

    if sensor_type == "temperature":
        return value < 50

    if sensor_type == "smoke":
        return value < 30

    if sensor_type == "occupancy":
        return value >= 0

    if sensor_type == "door":
        return value == "open"

    return False