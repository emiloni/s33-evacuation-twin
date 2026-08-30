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


def edge_allowed(
    edge_data: dict,
    mobility: str,
    blocked_nodes: Optional[Set[str]] = None,
) -> bool:

    if mobility not in MOBILITY_TYPES:
        raise ValueError(
            f"Unsupported mobility type: {mobility}"
        )

    blocked_nodes = blocked_nodes or set()

    # Wheelchair users cannot use stairs.
    if (
        mobility == "wheelchair"
        and edge_data.get("type") == "stairs"
    ):
        return False

    # Temporary injury avoids stairs.
    if (
        mobility == "temporary_injury"
        and edge_data.get("type") == "stairs"
    ):
        return False

    # Accessibility restriction.
    if not edge_data.get("accessible", True):
        if mobility in {
            "wheelchair",
            "temporary_injury",
        }:
            return False

    return True