import networkx as nx
from typing import Optional, Set

from .graph import build_graph
from .constraints import edge_allowed


def find_route(
    start: str,
    destination: str,
    mobility: str = "normal",
    blocked_nodes: Optional[Set[str]] = None,
):
    graph = build_graph()

    blocked_nodes = blocked_nodes or set()

    # Remove hazardous/blocked nodes.
    graph.remove_nodes_from(blocked_nodes)

    # Remove edges that violate mobility constraints.
    blocked_edges = []

    for u, v, data in graph.edges(data=True):
        if not edge_allowed(
            data,
            mobility,
            blocked_nodes,
        ):
            blocked_edges.append((u, v))

    graph.remove_edges_from(blocked_edges)

    # Start or destination itself is unavailable.
    if start in blocked_nodes:
        return {
            "success": False,
            "error": "Starting location is unavailable",
            "path": [],
            "distance": None,
        }

    if destination in blocked_nodes:
        return {
            "success": False,
            "error": "Destination is unavailable",
            "path": [],
            "distance": None,
        }

    try:
        path = nx.dijkstra_path(
            graph,
            start,
            destination,
            weight="weight",
        )

        distance = nx.dijkstra_path_length(
            graph,
            start,
            destination,
            weight="weight",
        )

        return {
            "success": True,
            "mobility": mobility,
            "start": start,
            "destination": destination,
            "path": path,
            "distance": distance,
        }

    except nx.NetworkXNoPath:

        return {
            "success": False,
            "mobility": mobility,
            "start": start,
            "destination": destination,
            "path": [],
            "distance": None,
            "error": (
                "No safe evacuation route available"
            ),
        }


if __name__ == "__main__":

    scenarios = {
        "normal": set(),

        "fire_north": {"N3"},

        "blocked_north": {"N3"},

        "flood_south": {"N5"},

        "exit_closed": {"EXIT1"},
    }

    for scenario, blocked_nodes in scenarios.items():

        print("\n==========================")
        print(f"Scenario: {scenario}")
        print("==========================")

        result = find_route(
            start="N1",
            destination="EXIT1",
            mobility="normal",
            blocked_nodes=blocked_nodes,
        )

        if result["success"]:
            print(
                "Route:",
                " -> ".join(result["path"]),
            )
            print(
                "Distance:",
                result["distance"],
            )
        else:
            print("ERROR:", result["error"])