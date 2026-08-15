from simulation.scenarios import (
    normal_scenario,
    fire_scenario,
    sensor_failure_scenario,
)

from simulation.hazard_detector import detect_hazards
from routing.dijkstra import find_route
from routing.safety import evaluate_sensor_state


def run_scenario(name, sensors):

    print("\n==============================")
    print("SCENARIO:", name)
    print("==============================")

    # 1. Evaluate sensor availability
    safety = evaluate_sensor_state(sensors)

    # 2. Detect hazards
    hazard_result = detect_hazards(sensors)

    blocked_nodes = hazard_result["blocked_nodes"]
    hazards = hazard_result["hazards"]

    print("\nSystem mode:")
    print(safety["mode"])

    print("Confidence:")
    print(safety["confidence"])

    print("\nDetected hazards:")

    if hazards:
        for hazard in hazards:
            print(
                "-",
                hazard["type"],
                "at",
                hazard["location"],
                "| severity:",
                hazard["severity"],
            )
    else:
        print("- None")

    print("\nBlocked nodes:")
    print(blocked_nodes)

    # 3. Calculate route
    result = find_route(
        start="N1",
        destination="EXIT1",
        mobility="normal",
        blocked_nodes=blocked_nodes,
    )

    print("\nEvacuation route:")

    if result["success"]:
        print(
            " -> ".join(result["path"])
        )

        print(
            "Distance:",
            result["distance"],
        )

    else:
        print("NO SAFE ROUTE")

        print(
            "Reason:",
            result["error"],
        )


if __name__ == "__main__":

    run_scenario(
        "NORMAL",
        normal_scenario(),
    )

    run_scenario(
        "FIRE",
        fire_scenario(),
    )

    run_scenario(
        "SENSOR FAILURE",
        sensor_failure_scenario(),
    )