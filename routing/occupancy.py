from typing import Dict, Any


def build_occupancy_map(
    sensors: list,
) -> Dict[str, float]:
    """
    Convert occupancy sensors into:

        {
            "NODE_ID": occupancy_value
        }

    Missing/unavailable sensors are ignored.
    """

    occupancy = {}

    for sensor in sensors:
        if not isinstance(sensor, dict):
            continue

        if sensor.get("type") != "occupancy":
            continue

        if not sensor.get("available", True):
            continue

        location = sensor.get("location")
        value = sensor.get("value")

        if not location:
            continue

        try:
            occupancy[location] = max(
                0.0,
                float(value),
            )
        except (
            TypeError,
            ValueError,
        ):
            continue

    return occupancy


def occupancy_penalty(
    occupancy: float,
) -> float:
    """
    Convert occupancy into additional
    routing cost.

    0 people   -> 0 penalty
    10 people  -> small penalty
    50 people  -> moderate penalty
    100 people -> high penalty
    """

    return occupancy * 0.10