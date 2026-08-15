from typing import List, Dict, Any

from .sensors import create_sensor


def normal_scenario() -> List[Dict[str, Any]]:
    return [
        create_sensor(
            "T1",
            "temperature",
            "N3",
            24,
        ),
        create_sensor(
            "S1",
            "smoke",
            "N3",
            5,
        ),
        create_sensor(
            "O1",
            "occupancy",
            "N2",
            15,
        ),
        create_sensor(
            "D1",
            "door",
            "EXIT1",
            "open",
        ),
    ]


def fire_scenario() -> List[Dict[str, Any]]:
    return [
        create_sensor(
            "T1",
            "temperature",
            "N3",
            85,
        ),
        create_sensor(
            "S1",
            "smoke",
            "N3",
            90,
        ),
        create_sensor(
            "O1",
            "occupancy",
            "N2",
            15,
        ),
        create_sensor(
            "D1",
            "door",
            "EXIT1",
            "open",
        ),
    ]


def sensor_failure_scenario() -> List[Dict[str, Any]]:
    return [
        create_sensor(
            "T1",
            "temperature",
            "N3",
            None,
            available=False,
        ),
        create_sensor(
            "S1",
            "smoke",
            "N3",
            None,
            available=False,
        ),
        create_sensor(
            "O1",
            "occupancy",
            "N2",
            15,
        ),
        create_sensor(
            "D1",
            "door",
            "EXIT1",
            "open",
        ),
    ]