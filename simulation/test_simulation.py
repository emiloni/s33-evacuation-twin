from .scenarios import (
    normal_scenario,
    fire_scenario,
    sensor_failure_scenario,
)

from routing.safety import evaluate_sensor_state


def print_scenario(name, sensors):

    result = evaluate_sensor_state(sensors)

    print("\n==========================")
    print("Scenario:", name)
    print("==========================")

    for sensor in sensors:
        print(
            sensor["id"],
            "|",
            sensor["type"],
            "|",
            sensor["location"],
            "|",
            sensor["value"],
            "| available:",
            sensor["available"],
        )

    print("\nSystem mode:", result["mode"])
    print("Confidence:", result["confidence"])
    print("Advisory:", result["advisory"])

    if result["unavailable_sensors"]:
        print(
            "Unavailable sensors:",
            result["unavailable_sensors"],
        )

    print("Message:", result["message"])


if __name__ == "__main__":

    print_scenario(
        "Normal",
        normal_scenario(),
    )

    print_scenario(
        "Fire",
        fire_scenario(),
    )

    print_scenario(
        "Sensor Failure",
        sensor_failure_scenario(),
    )