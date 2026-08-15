from typing import List, Dict, Any


HAZARD_TYPES = {
    "fire",
    "flood",
    "blocked_corridor",
    "closed_exit",
}


def validate_environment_hazards(
    hazards: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:

    validated = []

    for hazard in hazards:

        hazard_type = hazard.get("type")
        location = hazard.get("location")

        if hazard_type not in HAZARD_TYPES:
            raise ValueError(
                "Unsupported hazard type: "
                + str(hazard_type)
            )

        if not location:
            raise ValueError(
                "Hazard location is required"
            )

        validated.append({
            "type": hazard_type,
            "location": location,
            "severity": hazard.get(
                "severity",
                "high"
            ),
        })

    return validated


def environment_blocked_nodes(
    hazards: List[Dict[str, Any]]
) -> set:
    
    blocked = set()

    for hazard in hazards:

        hazard_type = hazard["type"]

        if hazard_type in {
            "fire",
            "flood",
            "blocked_corridor",
            "closed_exit",
        }:
            blocked.add(
                hazard["location"]
            )

    return blocked