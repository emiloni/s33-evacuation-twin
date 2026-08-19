from typing import List, Dict, Any


def detect_hazards(
    sensors: List[Dict[str, Any]]
) -> Dict[str, Any]:

    blocked_nodes = set()
    hazard_map = {}

    for sensor in sensors:

        # --------------------------------------------------
        # Ignore malformed sensor records
        # --------------------------------------------------

        if not isinstance(sensor, dict):
            continue

        sensor_id = sensor.get(
            "id",
            "unknown",
        )

        sensor_type = sensor.get(
            "type"
        )

        value = sensor.get(
            "value"
        )

        location = sensor.get(
            "location"
        )

        available = sensor.get(
            "available",
            True,
        )

        if not sensor_type or not location:
            continue

        # --------------------------------------------------
        # Sensor failure
        #
        # A failed sensor does NOT create a hazard.
        # Safety mode is handled separately by
        # routing.safety.evaluate_sensor_state().
        # --------------------------------------------------

        if not available:
            continue

        hazard_type = None
        severity = None

        # --------------------------------------------------
        # Temperature → fire
        # --------------------------------------------------

        if sensor_type == "temperature":

            try:
                temperature = float(value)
            except (
                TypeError,
                ValueError,
            ):
                continue

            if temperature >= 50:
                hazard_type = "fire"
                severity = "high"

        # --------------------------------------------------
        # Smoke → fire
        # --------------------------------------------------

        elif sensor_type == "smoke":

            try:
                smoke = float(value)
            except (
                TypeError,
                ValueError,
            ):
                continue

            if smoke >= 30:
                hazard_type = "fire"
                severity = "high"

        # --------------------------------------------------
        # Flood sensor → flood
        #
        # Supported active values:
        #   true
        #   "true"
        #   "flood"
        #   "detected"
        #
        # Numeric values > 0 are also treated as
        # flood detected.
        # --------------------------------------------------

        elif sensor_type == "flood":

            flood_detected = False

            if isinstance(value, bool):
                flood_detected = value

            elif isinstance(value, str):
                flood_detected = (
                    value.lower()
                    in {
                        "true",
                        "flood",
                        "detected",
                        "active",
                    }
                )

            else:
                try:
                    flood_detected = (
                        float(value) > 0
                    )
                except (
                    TypeError,
                    ValueError,
                ):
                    flood_detected = False

            if flood_detected:
                hazard_type = "flood"
                severity = "high"

        # --------------------------------------------------
        # Blocked corridor
        #
        # Supported active values:
        #   true
        #   "true"
        #   "blocked"
        #   "detected"
        # --------------------------------------------------

        elif sensor_type == "blocked_corridor":

            blocked = False

            if isinstance(value, bool):
                blocked = value

            elif isinstance(value, str):
                blocked = (
                    value.lower()
                    in {
                        "true",
                        "blocked",
                        "detected",
                        "active",
                    }
                )

            else:
                try:
                    blocked = (
                        float(value) > 0
                    )
                except (
                    TypeError,
                    ValueError,
                ):
                    blocked = False

            if blocked:
                hazard_type = (
                    "blocked_corridor"
                )
                severity = "high"
            # --------------------------------------------------
# Blocked corridor → blocked corridor
# --------------------------------------------------

        elif (
            sensor_type == "blocked_corridor"
            and value == "blocked"
        ):
            hazard_type = "blocked_corridor"
            severity = "high"
        # --------------------------------------------------
        # Door → closed exit
        # --------------------------------------------------

        elif sensor_type == "door":

            if (
                isinstance(value, str)
                and value.lower()
                == "closed"
            ):
                hazard_type = (
                    "closed_exit"
                )
                severity = "high"

        # --------------------------------------------------
        # No hazard detected
        # --------------------------------------------------

        if hazard_type is None:
            continue

        # --------------------------------------------------
        # Block the affected location
        #
        # This keeps the existing routing contract:
        #
        # hazard_detector
        #       ↓
        # blocked_nodes
        #       ↓
        # Dijkstra
        # --------------------------------------------------

        blocked_nodes.add(
            location
        )

        # --------------------------------------------------
        # Deduplicate hazards
        # --------------------------------------------------

        key = (
            hazard_type,
            location,
        )

        if key not in hazard_map:

            hazard_map[key] = {
                "type": hazard_type,
                "location": location,
                "source_sensors": [],
                "severity": severity,
            }

        if sensor_id not in (
            hazard_map[key][
                "source_sensors"
            ]
        ):

            hazard_map[key][
                "source_sensors"
            ].append(
                sensor_id
            )

    return {
        "blocked_nodes": blocked_nodes,
        "hazards": list(
            hazard_map.values()
        ),
    }


if __name__ == "__main__":

    test_sensors = [
        {
            "id": "TEMP1",
            "type": "temperature",
            "location": "F3_N2",
            "value": 80,
            "available": True,
        },
        {
            "id": "FLOOD1",
            "type": "flood",
            "location": "F2_N2",
            "value": True,
            "available": True,
        },
        {
            "id": "BLOCK1",
            "type": "blocked_corridor",
            "location": "F1_N2",
            "value": True,
            "available": True,
        },
        {
            "id": "DOOR1",
            "type": "door",
            "location": "F1_EXIT1",
            "value": "closed",
            "available": True,
        },
    ]

    result = detect_hazards(
        test_sensors
    )

    print("\nDetected hazards:")

    for hazard in result[
        "hazards"
    ]:
        print(hazard)

    print(
        "\nBlocked nodes:"
    )

    print(
        sorted(
            result[
                "blocked_nodes"
            ]
        )
    )