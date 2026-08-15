import json
from pathlib import Path

import networkx as nx


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"


def load_json(filename: str):
    with open(DATA_DIR / filename, "r", encoding="utf-8") as file:
        return json.load(file)


def build_graph():
    nodes = load_json("nodes.json")
    edges = load_json("edges.json")

    graph = nx.Graph()

    for node in nodes:
        graph.add_node(
            node["id"],
            x=node["x"],
            y=node["y"],
            type=node["type"],
        )

    for edge in edges:
        graph.add_edge(
            edge["from"],
            edge["to"],
            weight=edge["weight"],
            type=edge["type"],
            accessible=edge["accessible"],
        )

    return graph