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


def activate_building(
    dataset: BuildingDataset
) -> Dict[str, Any]:

    validation = validate_building(
        dataset
    )

    building = dataset.model_dump(
        by_alias=True
    )

    set_active_building(
        building
    )

    return validation