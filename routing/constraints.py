from typing import Optional, Set


MOBILITY_TYPES = {
    "normal",
    "wheelchair",
    "temporary_injury",
    "child",
    "elderly",
    "first_responder",
}

HAZARD_TYPES = {
    "fire",
    "flood",
    "blocked_corridor",
    "closed_exit",
}

# Edge types recognized by the routing system
EDGE_TYPES = {
    "corridor",
    "stairs",
    "ramp",
    "elevator",
    "door",
}


def edge_allowed(
    edge_data: dict,
    mobility: str,
    blocked_nodes: Optional[Set[str]] = None,
    hazard_type: Optional[str] = None,
    elevator_emergency_approved: bool = False,
) -> bool:

    if mobility not in MOBILITY_TYPES:
        raise ValueError(
            f"Unsupported mobility type: {mobility}"
        )

    blocked_nodes = blocked_nodes or set()
    edge_type = edge_data.get("type", "corridor")

    # Elevator safety rule: during fire, elevators are
    # unavailable unless explicitly approved.
    if (
        edge_type == "elevator"
        and hazard_type == "fire"
        and not elevator_emergency_approved
    ):
        return False

    # Blocked elevators are never available
    if (
        edge_type == "elevator"
        and not edge_data.get("accessible", True)
    ):
        return False

    # Wheelchair users: cannot use stairs, ramps OK
    if mobility == "wheelchair":
        if edge_type == "stairs":
            return False
        if edge_type == "ramp":
            return True

    # Temporary injury: avoids stairs, ramps preferred
    if mobility == "temporary_injury":
        if edge_type == "stairs":
            return False
        if edge_type == "ramp":
            return True

    # Accessibility restriction
    if not edge_data.get("accessible", True):
        if mobility in {
            "wheelchair",
            "temporary_injury",
        }:
            return False

    return True
