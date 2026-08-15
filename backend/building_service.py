from typing import Dict, Any

from routing.building_store import (
    set_active_building,
)

from .building_schema import (
    BuildingDataset,
)


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

    exit_nodes = [
        node.id
        for node in dataset.nodes
        if node.type == "exit"
    ]

    if not exit_nodes:
        raise ValueError(
            "Building must contain at least one exit."
        )

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
    }


def activate_building(
    dataset: BuildingDataset
) -> Dict[str, Any]:

    validation = validate_building(
        dataset
    )

    building = dataset.dict(
        by_alias=True
    )

    set_active_building(
        building
    )

    return validation