from simulation.environment import (
    validate_environment_hazards,
    environment_blocked_nodes,
)

from routing.dijkstra import find_route


def test_environment(
    name,
    hazards,
):

    print("\n==============================")
    print("SCENARIO:", name)
    print("==============================")

    hazards = validate_environment_hazards(
        hazards
    )

    blocked = environment_blocked_nodes(
        hazards
    )

    print("Hazards:")

    for hazard in hazards:
        print(
            "-",
            hazard["type"],
            "at",
            hazard["location"],
        )

    print("\nBlocked nodes:")
    print(blocked)

    result = find_route(
        start="N1",
        destination="EXIT1",
        mobility="normal",
        blocked_nodes=blocked,
    )

    print("\nRoute:")

    if result["success"]:
        print(
            " -> ".join(result["path"])
        )
        print(
            "Distance:",
            result["distance"],
        )
    else:
        print(
            "NO SAFE ROUTE:",
            result["error"],
        )


if __name__ == "__main__":

    test_environment(
        "FLOOD",
        [
            {
                "type": "flood",
                "location": "N5",
                "severity": "high",
            }
        ],
    )

    test_environment(
        "BLOCKED CORRIDOR",
        [
            {
                "type": "blocked_corridor",
                "location": "N5",
                "severity": "high",
            }
        ],
    )

    test_environment(
        "CLOSED EXIT",
        [
            {
                "type": "closed_exit",
                "location": "EXIT1",
                "severity": "high",
            }
        ],
    )