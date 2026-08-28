from typing import Dict, Any

from routing.building_store import (
    set_active_building,
)

from .building_schema import (
    BuildingDataset,
)


ALLOWED_NODE_TYPES = {
    "room",
    "corridor",
    "exit",
    "stairs",
    "elevator",
    "ramp",
}


ALLOWED_EDGE_TYPES = {
    "corridor",
    "stairs",
    "elevator",
    "ramp",
}


def validate_building(
    dataset: BuildingDataset
) -> Dict[str, Any]:

    node_ids = {
        node.id
        for node in dataset.nodes
    }

    if not node_ids:
        raise ValueError(
            "Building must contain at least one node."
        )

    # ---------------------------------------------------------
    # Validate node types
    # ---------------------------------------------------------

    for node in dataset.nodes:

        if node.type not in ALLOWED_NODE_TYPES:
            raise ValueError(
                f"Unsupported node type '{node.type}' "
                f"for node '{node.id}'."
            )

        if node.floor < 1:
            raise ValueError(
                f"Invalid floor for node '{node.id}'."
            )

    # ---------------------------------------------------------
    # Find exits
    # ---------------------------------------------------------

    exit_nodes = [
        node.id
        for node in dataset.nodes
        if node.type == "exit"
    ]

    if not exit_nodes:
        raise ValueError(
            "Building must contain at least one exit."
        )

    # ---------------------------------------------------------
    # Validate edges
    # ---------------------------------------------------------

    for edge in dataset.edges:

        if edge.from_node not in node_ids:
            raise ValueError(
                "Edge references unknown node: "
                + edge.from_node
            )

        if edge.to_node not in node_ids:
            raise ValueError(
                "Edge references unknown node: "
                + edge.to_node
            )

        if edge.weight <= 0:
            raise ValueError(
                "Edge weight must be greater than zero."
            )

        if edge.type not in ALLOWED_EDGE_TYPES:
            raise ValueError(
                f"Unsupported edge type '{edge.type}'."
            )

    # ---------------------------------------------------------
    # Determine floors
    # ---------------------------------------------------------

    floors = sorted({
        node.floor
        for node in dataset.nodes
    })

    # ---------------------------------------------------------
    # Validate vertical connections
    # ---------------------------------------------------------

    vertical_edges = []

    for edge in dataset.edges:

        from_node = next(
            node
            for node in dataset.nodes
            if node.id == edge.from_node
        )

        to_node = next(
            node
            for node in dataset.nodes
            if node.id == edge.to_node
        )

        crosses_floor = (
            from_node.floor !=
            to_node.floor
        )

        if crosses_floor:

            if edge.type not in {
                "stairs",
                "elevator",
                "ramp",
            }:
                raise ValueError(
                    f"Edge '{edge.from_node} -> "
                    f"{edge.to_node}' connects "
                    "different floors but is not "
                    "stairs, elevator, or ramp."
                )

            vertical_edges.append({
                "from": edge.from_node,
                "to": edge.to_node,
                "type": edge.type,
                "from_floor": from_node.floor,
                "to_floor": to_node.floor,
            })

    return {
        "node_count": len(
            dataset.nodes
        ),
        "edge_count": len(
            dataset.edges
        ),
        "exit_count": len(
            exit_nodes
        ),
        "exit_nodes": exit_nodes,
        "floor_count": len(floors),
        "floors": floors,
        "vertical_connections": vertical_edges,
    }


def _infer_edges_from_nodes(nodes: list) -> list:
    """Infer edges from spatial proximity when edges are missing."""
    import math

    if not nodes:
        return []

    def dist(a, b):
        return math.hypot(a["x"] - b["x"], a["y"] - b["y"])

    edges = []
    seen = set()

    def add_edge(src, dst, etype, accessible=True):
        key = tuple(sorted([src["id"], dst["id"]]))
        if key in seen or src["id"] == dst["id"]:
            return
        seen.add(key)
        # Calculate door position: 80% from src toward dst (at wall boundary)
        door_x = round(src["x"] + 0.8 * (dst["x"] - src["x"]))
        door_y = round(src["y"] + 0.8 * (dst["y"] - src["y"]))
        edges.append({
            "from": src["id"],
            "to": dst["id"],
            "weight": round(dist(src, dst), 1),
            "type": etype,
            "accessible": accessible,
            "door_x": door_x,
            "door_y": door_y,
        })

    corridors = [n for n in nodes if n.get("type") == "corridor"]
    rooms = [n for n in nodes if n.get("type") == "room"]
    stairs = [n for n in nodes if n.get("type") == "stairs"]
    elevators = [n for n in nodes if n.get("type") == "elevator"]
    exits = [n for n in nodes if n.get("type") == "exit"]
    walkable = corridors + rooms + stairs + elevators

    for room in rooms:
        same_floor = [c for c in corridors if c.get("floor") == room.get("floor")]
        if same_floor:
            nearest = min(same_floor, key=lambda c: dist(room, c))
            add_edge(room, nearest, "corridor")

    for node in stairs + elevators:
        same_floor = [c for c in corridors if c.get("floor") == node.get("floor")]
        if same_floor:
            nearest = min(same_floor, key=lambda c: dist(node, c))
            add_edge(node, nearest, node.get("type", "corridor"), accessible=node.get("type") != "stairs")

    for exit_node in exits:
        candidates = stairs + corridors + elevators
        if candidates:
            nearest_all = min(candidates, key=lambda c: dist(exit_node, c))
            nearest_dist = dist(exit_node, nearest_all)
            near_stairs = [s for s in stairs if dist(exit_node, s) <= nearest_dist * 2.0]
            target = min(near_stairs, key=lambda c: dist(exit_node, c)) if near_stairs else nearest_all
            add_edge(exit_node, target, "corridor")

    if not corridors:
        for room in rooms:
            others = [n for n in walkable if n["id"] != room["id"]]
            if others:
                nearest = min(others, key=lambda n: dist(room, n))
                add_edge(room, nearest, "corridor")

    return edges


def activate_building(
    dataset: BuildingDataset
) -> Dict[str, Any]:

    validation = validate_building(
        dataset
    )

    building = dataset.model_dump(
        by_alias=True
    )

    # If edges are missing, infer them from node positions
    stored_edges = building.get("edges", [])
    stored_nodes = building.get("nodes", [])
    if len(stored_edges) < len(stored_nodes) - 1 and stored_nodes:
        inferred = _infer_edges_from_nodes(stored_nodes)
        existing = {
            tuple(sorted([e["from"], e["to"]]))
            for e in stored_edges
        }
        for ie in inferred:
            key = tuple(sorted([ie["from"], ie["to"]]))
            if key not in existing:
                stored_edges.append(ie)
                existing.add(key)
        building["edges"] = stored_edges

    set_active_building(
        building
    )

    return validation