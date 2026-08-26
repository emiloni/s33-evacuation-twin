import json
from pathlib import Path
from typing import Dict, Any, Optional

import networkx as nx

from .building_store import get_active_building


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"


def load_json(
    filename: str
) -> Any:

    with open(
        DATA_DIR / filename,
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def build_graph_from_data(
    building: Dict[str, Any]
) -> nx.Graph:

    graph = nx.Graph()

    nodes = building.get(
        "nodes",
        []
    )

    edges = building.get(
        "edges",
        []
    )

    for node in nodes:

        graph.add_node(
            node["id"],
            x=node["x"],
            y=node["y"],
            type=node["type"],
            floor=node.get(
                "floor",
                1
            ),
            label=node.get(
                "label",
                node["id"]
            ),
        )

    for edge in edges:

        graph.add_edge(
            edge["from"],
            edge["to"],
            weight=edge.get(
                "weight",
                1
            ),
            type=edge.get(
                "type",
                "corridor"
            ),
            accessible=edge.get(
                "accessible",
                True
            ),
        )

    return graph


def build_graph() -> nx.Graph:

    active = get_active_building()

    if active is not None:
        print(
            "ACTIVE BUILDING GRAPH:",
            active.get("building"),
            "NODES:",
            len(active.get("nodes", [])),
            "EDGES:",
            len(active.get("edges", [])),
        )

        return build_graph_from_data(
            active
        )

    print(
        "NO ACTIVE BUILDING -> USING DEMO GRAPH"
    )

    demo_building = load_json(
        "demo_building.json"
    )

    return build_graph_from_data(
        demo_building
    )