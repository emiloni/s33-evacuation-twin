from typing import (
    List,
    Dict,
    Any,
    Optional,
    Set,
)

import networkx as nx

from .graph import build_graph
from .constraints import edge_allowed
from .occupancy import occupancy_penalty


def get_available_exits(
    graph: nx.Graph,
    blocked_nodes: Set[str],
) -> List[str]:

    exits = []

    for node, data in graph.nodes(
        data=True
    ):

        if data.get("type") != "exit":
            continue

        if node in blocked_nodes:
            continue

        exits.append(node)

    return exits


def find_best_exit(
    start: str,
    mobility: str = "normal",
    blocked_nodes: Optional[Set[str]] = None,
    occupancy: Optional[
        Dict[str, float]
    ] = None,
) -> Dict[str, Any]:

    # ---------------------------------------------------------
    # Defaults
    # ---------------------------------------------------------

    if blocked_nodes is None:
        blocked_nodes = set()

    if occupancy is None:
        occupancy = {}

    # ---------------------------------------------------------
    # Build graph
    # ---------------------------------------------------------

    graph = build_graph()

    # ---------------------------------------------------------
    # Validate starting node
    # ---------------------------------------------------------

    if start not in graph:

        return {
            "success": False,
            "exit": None,
            "route": [],
            "distance": None,
            "available_exits": [],
            "error": (
                f"Starting node '{start}' "
                "does not exist in the active building."
            ),
        }

    if start in blocked_nodes:

        return {
            "success": False,
            "exit": None,
            "route": [],
            "distance": None,
            "available_exits": [],
            "error": (
                f"Starting node '{start}' "
                "is blocked or unsafe."
            ),
        }

    # ---------------------------------------------------------
    # Find available exits
    # ---------------------------------------------------------

    available_exits = get_available_exits(
        graph,
        blocked_nodes,
    )

    if not available_exits:

        return {
            "success": False,
            "exit": None,
            "route": [],
            "distance": None,
            "available_exits": [],
            "error": (
                "No available evacuation exits."
            ),
        }

    # ---------------------------------------------------------
    # Remove blocked nodes
    # ---------------------------------------------------------

    graph.remove_nodes_from(
        blocked_nodes
    )

    if start not in graph:

        return {
            "success": False,
            "exit": None,
            "route": [],
            "distance": None,
            "available_exits": (
                available_exits
            ),
            "error": (
                f"Starting node '{start}' "
                "is unavailable."
            ),
        }

    # ---------------------------------------------------------
    # Apply mobility constraints
    # ---------------------------------------------------------

    blocked_edges = []

    for u, v, data in graph.edges(
        data=True
    ):

        if not edge_allowed(
            data,
            mobility,
            blocked_nodes,
        ):

            blocked_edges.append(
                (u, v)
            )

    graph.remove_edges_from(
        blocked_edges
    )

    # ---------------------------------------------------------
    # Apply occupancy-aware routing cost
    # ---------------------------------------------------------

    for u, v, data in graph.edges(
        data=True
    ):

        base_weight = float(
            data.get(
                "weight",
                1,
            )
        )

        from_occupancy = occupancy.get(
            u,
            0.0,
        )

        to_occupancy = occupancy.get(
            v,
            0.0,
        )

        average_occupancy = (
            from_occupancy
            + to_occupancy
        ) / 2

        congestion_cost = (
            occupancy_penalty(
                average_occupancy
            )
        )

        data["routing_weight"] = (
            base_weight
            + congestion_cost
        )

    # ---------------------------------------------------------
    # Find best safe route
    # ---------------------------------------------------------

    best_exit = None
    best_route = None
    best_distance = None

    for exit_node in available_exits:

        if exit_node not in graph:
            continue

        try:

            route = nx.dijkstra_path(
                graph,
                start,
                exit_node,
                weight="routing_weight",
            )

            distance = (
                nx.dijkstra_path_length(
                    graph,
                    start,
                    exit_node,
                    weight="routing_weight",
                )
            )

            if (
                best_distance is None
                or distance < best_distance
            ):

                best_exit = exit_node
                best_route = route
                best_distance = distance

        except nx.NetworkXNoPath:

            continue

        except nx.NodeNotFound:

            continue

    # ---------------------------------------------------------
    # No reachable exit
    # ---------------------------------------------------------

    if best_exit is None:

        return {
            "success": False,
            "exit": None,
            "route": [],
            "distance": None,
            "available_exits": (
                available_exits
            ),
            "error": (
                "No safe evacuation route "
                "to any available exit."
            ),
        }

    # ---------------------------------------------------------
    # Success
    # ---------------------------------------------------------

    return {
        "success": True,
        "exit": best_exit,
        "route": best_route,
        "distance": best_distance,
        "available_exits": (
            available_exits
        ),
    }