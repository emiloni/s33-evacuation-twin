from typing import Optional, Set

import networkx as nx

from .graph import build_graph
from .constraints import edge_allowed
from .exits import find_best_exit


def find_route(
    start: str,
    destination: str,
    mobility: str = "normal",
    blocked_nodes: Optional[Set[str]] = None,
):
    graph = build_graph()

    blocked_nodes = blocked_nodes or set()

    graph.remove_nodes_from(
        blocked_nodes
    )

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

    if start in blocked_nodes:
        return {
            "success": False,
            "error": (
                "Starting location "
                "is unavailable"
            ),
            "path": [],
            "distance": None,
        }

    if destination in blocked_nodes:
        return {
            "success": False,
            "error": (
                "Destination is unavailable"
            ),
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

    except (nx.NetworkXNoPath, nx.NodeNotFound) as e:

        return {
            "success": False,
            "mobility": mobility,
            "start": start,
            "destination": destination,
            "path": [],
            "distance": None,
            "error": (
                "No safe evacuation "
                "route available"
            ),
        }


def find_evacuation_route(
    start,
    destination=None,
    mobility="normal",
    blocked_nodes=None,
    occupancy=None,
):
    """
    If destination is supplied:
        route directly to that destination.

    If destination is None:
        automatically select the best
        available exit.
    """

    blocked_nodes = (
        blocked_nodes or set()
    )

    if destination:
        return find_route(
            start=start,
            destination=destination,
            mobility=mobility,
            blocked_nodes=blocked_nodes,
        )

    return find_best_exit(
        start=start,
        mobility=mobility,
        blocked_nodes=blocked_nodes,
        occupancy=occupancy,
    )


if __name__ == "__main__":

    print("\n3-Floor Normal User:")

    print(
        find_evacuation_route(
            start="F3_N1",
            mobility="normal",
        )
    )

    print("\n3-Floor Wheelchair User:")

    print(
        find_evacuation_route(
            start="F3_N1",
            mobility="wheelchair",
        )
    )