from routing.dijkstra import find_route


def run_test(
    mobility,
    blocked_nodes,
):

    print("\n==============================")
    print("Mobility:", mobility)
    print(
        "Blocked:",
        blocked_nodes,
    )
    print("==============================")


    result = find_route(
        start="N1",
        destination="EXIT1",
        mobility=mobility,
        blocked_nodes=blocked_nodes,
    )


    if result["success"]:

        print(
            "Route:",
            " -> ".join(
                result["path"]
            ),
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

    # Fire blocks N3.
    run_test(
        "normal",
        {"N3"},
    )

    # Same fire, but wheelchair user.
    run_test(
        "wheelchair",
        {"N3"},
    )

    # Flood blocks N5.
    run_test(
        "wheelchair",
        {"N5"},
    )