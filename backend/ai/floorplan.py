import base64
import json
import os
import math
import re
from typing import Any

import requests

from dotenv import load_dotenv

load_dotenv()
OPENROUTER_URL = (
    "https://openrouter.ai/api/v1/chat/completions"
)

# Vision-capable model.
# We can change this later without changing the frontend.
OPENROUTER_MODEL = os.getenv(
    "OPENROUTER_VISION_MODEL",
    "google/gemini-2.5-flash",
)


SYSTEM_PROMPT = """
You are the floor-plan analysis engine for S33 Evacuation Digital Twin.

Your job is to inspect a building floor-plan image and convert the
visible evacuation-relevant structure into a machine-readable graph.

IMPORTANT:
- Do NOT invent rooms, doors, exits or stairs that cannot reasonably
  be inferred from the image.
- Preserve visible room labels whenever possible.
- Detect corridors and major circulation areas.
- Detect doors/openings connecting rooms and corridors.
- Detect staircases and elevators.
- Detect emergency exits.
- Detect walls only when needed to understand connectivity.
- Coordinates must use the original image coordinate system:
  x increases from left to right.
  y increases from top to bottom.
- Every node needs a unique ID.
- Every edge must connect two existing node IDs.
- Edges represent walkable connectivity, not walls.
- Do not create evacuation routes yourself.
- The S33 deterministic routing engine will calculate routes later.

CRITICAL - DOOR DETECTION:
Doors are the most important feature for evacuation routing.
You MUST:
1. Detect EVERY door visible in the floor plan.
2. For each door, add the x,y pixel coordinates to the edge connecting the two spaces.
3. Doors appear as openings in walls between rooms and corridors.
4. Place door coordinates AT the wall opening, NOT at room centers.

Return ONLY valid JSON.
Do not use markdown.
Do not wrap the JSON in ```.

Return exactly this structure:

{
  "building": {
    "id": "AI_BUILDING_1",
    "name": "Detected Building",
    "floors": 1
  },
  "nodes": [
    {
      "id": "F1_N1",
      "x": 100,
      "y": 100,
      "type": "room",
      "floor": 1,
      "label": "Room 101"
    }
  ],
  "edges": [
    {
      "from": "F1_N1",
      "to": "F1_N2",
      "weight": 1,
      "type": "corridor",
      "accessible": true,
      "door_x": 150,
      "door_y": 120
    }
  ],
  "analysis": {
    "rooms_detected": 0,
    "doors_detected": 0,
    "stairs_detected": 0,
    "elevators_detected": 0,
    "exits_detected": 0,
    "confidence": "medium",
    "warnings": []
  }
}

Allowed node types:

- room
- corridor
- stair
- elevator
- exit
- entrance
- junction

For a door, normally connect the two spaces it connects rather than
creating a separate door node.

For stairs:
- Use type "stair".
- Use the same stair node ID convention across floors when a visible
  stair connects floors, but create one node per floor.
- Connect the stair nodes between floors when the image/document
  provides enough evidence.

For exits:
- Use type "exit".
- Label them clearly, for example "Exit Main", "Exit North".

Weight should approximate walking distance in image coordinates.
Accessible should be false only when the connection is clearly not
wheelchair accessible.

If the floor plan is ambiguous, still return the best-supported graph
and put the uncertainty into analysis.warnings.
"""


def _image_data_url(
    content: bytes,
    filename: str,
) -> str:

    extension = (
        filename.lower().rsplit(".", 1)[-1]
        if "." in filename
        else "png"
    )

    mime_types = {
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "gif": "image/gif",
    }

    mime = mime_types.get(
        extension,
        "image/png",
    )

    encoded = base64.b64encode(
        content
    ).decode("utf-8")

    return (
        f"data:{mime};base64,{encoded}"
    )


def _extract_json(text: str) -> dict[str, Any]:

    text = text.strip()

    # Normal case.
    try:
        value = json.loads(text)

        if isinstance(value, dict):
            return value

    except json.JSONDecodeError:
        pass

    # Sometimes models still return markdown fences.
    fenced = re.search(
        r"```(?:json)?\s*(.*?)\s*```",
        text,
        re.DOTALL | re.IGNORECASE,
    )

    if fenced:
        try:
            value = json.loads(
                fenced.group(1)
            )

            if isinstance(value, dict):
                return value

        except json.JSONDecodeError:
            pass

    # Last attempt: find the outer JSON object.
    start = text.find("{")
    end = text.rfind("}")

    if start >= 0 and end > start:

        candidate = text[
            start : end + 1
        ]

        try:
            value = json.loads(candidate)

            if isinstance(value, dict):
                return value

        except json.JSONDecodeError:
            pass

    print("\n========== AI RAW RESPONSE ==========")
    print(text)
    print("========== END AI RAW RESPONSE ==========\n")


    raise ValueError(
        "AI returned invalid JSON."
    )



def _infer_edges(nodes: list[dict]) -> list[dict]:
    """Infer edges from spatial proximity when the AI returns few or no edges.

    This is a fallback: when the vision model fails to output connectivity,
    we connect nodes based on their 2D positions and types.
    """

    if not nodes:
        return []

    def _dist(a: dict, b: dict) -> float:
        return math.hypot(a["x"] - b["x"], a["y"] - b["y"])

    edges: list[dict] = []
    edge_set: set[tuple[str, str]] = set()

    def _add_edge(src: dict, dst: dict, etype: str, accessible: bool = True) -> None:
        key = tuple(sorted([src["id"], dst["id"]]))
        if key in edge_set or src["id"] == dst["id"]:
            return
        edge_set.add(key)
        # Calculate door position: 80% from src toward dst (at wall boundary)
        door_x = round(src["x"] + 0.8 * (dst["x"] - src["x"]))
        door_y = round(src["y"] + 0.8 * (dst["y"] - src["y"]))
        edges.append({
            "from": src["id"],
            "to": dst["id"],
            "weight": round(_dist(src, dst), 1),
            "type": etype,
            "accessible": accessible,
            "door_x": door_x,
            "door_y": door_y,
        })

    # Classify nodes by type and floor
    corridors = [n for n in nodes if n.get("type") == "corridor"]
    rooms = [n for n in nodes if n.get("type") == "room"]
    stairs = [n for n in nodes if n.get("type") == "stairs"]
    elevators = [n for n in nodes if n.get("type") == "elevator"]
    exits = [n for n in nodes if n.get("type") == "exit"]
    junctions = [n for n in nodes if n.get("type") in ("junction", "entrance")]

    # All walkable non-exit nodes
    walkable = corridors + rooms + stairs + elevators + junctions

    # 1) Connect every room to the nearest corridor on the same floor
    for room in rooms:
        same_floor_corridors = [c for c in corridors if c.get("floor") == room.get("floor")]
        if same_floor_corridors:
            nearest = min(same_floor_corridors, key=lambda c: _dist(room, c))
            _add_edge(room, nearest, "corridor", accessible=True)

    # 2) Connect corridors to nearest corridors on the same floor
    #    (useful when there are multiple corridor segments)
    for i, c1 in enumerate(corridors):
        same_floor_others = [
            c2 for j, c2 in enumerate(corridors)
            if j != i and c2.get("floor") == c1.get("floor")
        ]
        if same_floor_others:
            nearest = min(same_floor_others, key=lambda c: _dist(c1, c))
            _add_edge(c1, nearest, "corridor", accessible=True)

    # 3) Connect stairs/elevators to nearest corridor on the same floor
    for node in stairs + elevators:
        same_floor_corridors = [c for c in corridors if c.get("floor") == node.get("floor")]
        if same_floor_corridors:
            nearest = min(same_floor_corridors, key=lambda c: _dist(node, c))
            etype = node.get("type", "corridor")
            acc = etype != "stairs"
            _add_edge(node, nearest, etype, accessible=acc)

    # 4) Connect stairs/elevators to nearest stair/elevator on any floor
    #    (vertical connections between floors)
    for s1 in stairs + elevators:
        for s2 in stairs + elevators:
            if s1["id"] == s2["id"]:
                continue
            if s1.get("floor") != s2.get("floor"):
                # Only connect if same label prefix (e.g. STAIR_A on floor 1 and 2)
                label1 = s1.get("label", "").upper()
                label2 = s2.get("label", "").upper()
                # Extract the prefix before digits
                import re
                prefix1 = re.sub(r'\d+.*$', '', label1).strip()
                prefix2 = re.sub(r'\d+.*$', '', label2).strip()
                if prefix1 and prefix1 == prefix2:
                    etype = s1.get("type", "corridor")
                    acc = etype != "stairs"
                    _add_edge(s1, s2, etype, accessible=acc)

    # 5) Connect exits to nearest walkable node (stairs preferred if close)
    for exit_node in exits:
        candidates = stairs + corridors + elevators
        if candidates:
            # Prefer stairs within 1.5x the nearest distance
            nearest_all = min(candidates, key=lambda c: _dist(exit_node, c))
            nearest_dist = _dist(exit_node, nearest_all)
            near_stairs = [s for s in stairs if _dist(exit_node, s) <= nearest_dist * 2.0]
            target = min(near_stairs, key=lambda c: _dist(exit_node, c)) if near_stairs else nearest_all
            _add_edge(exit_node, target, "corridor", accessible=True)

    # 6) If still no corridors, connect rooms directly to nearest walkable node
    if not corridors:
        for room in rooms:
            others = [n for n in walkable if n["id"] != room["id"]]
            if others:
                nearest = min(others, key=lambda n: _dist(room, n))
                _add_edge(room, nearest, "corridor", accessible=True)

    return edges



def _normalise_graph(
    result: dict[str, Any],
) -> dict[str, Any]:

    nodes = result.get("nodes", [])
    edges = result.get("edges", [])

    clean_nodes = []
    node_ids = set()

    # ---------------------------------------------------------
    # NORMALISE NODE TYPES
    # ---------------------------------------------------------

    NODE_TYPE_MAP = {
        "stair": "stairs",
        "stairs": "stairs",
        "lift": "elevator",
        "elevator": "elevator",
        "room": "room",
        "corridor": "corridor",
        "exit": "exit",
        "ramp": "ramp",
    }

    for index, node in enumerate(nodes):

        if not isinstance(node, dict):
            continue

        node_id = str(
            node.get(
                "id",
                f"AI_N{index + 1}",
            )
        )

        if node_id in node_ids:
            node_id = f"{node_id}_{index + 1}"

        node_ids.add(node_id)

        try:
            x = float(node.get("x", 0))
        except (TypeError, ValueError):
            x = 0

        try:
            y = float(node.get("y", 0))
        except (TypeError, ValueError):
            y = 0

        try:
            floor = int(node.get("floor", 1))
        except (TypeError, ValueError):
            floor = 1

        raw_type = str(
            node.get(
                "type",
                "room",
            )
        ).lower().strip()

        node_type = NODE_TYPE_MAP.get(
            raw_type,
            "room",
        )

        clean_nodes.append(
            {
                "id": node_id,
                "x": x,
                "y": y,
                "type": node_type,
                "floor": floor,
                "label": str(
                    node.get(
                        "label",
                        node_id,
                    )
                ),
            }
        )

    # ---------------------------------------------------------
    # NORMALISE EDGE TYPES
    # ---------------------------------------------------------
    clean_edges = []

    for edge in edges:

        if not isinstance(edge, dict):
            continue

        source = str(
            edge.get(
                "from",
                edge.get("from_node", ""),
            )
        )

        target = str(
            edge.get(
                "to",
                edge.get("to_node", ""),
            )
        )

        if (
            not source
            or not target
            or source not in node_ids
            or target not in node_ids
            or source == target
        ):
            continue

        try:
            weight = float(
                edge.get(
                    "weight",
                    1,
                )
            )
        except (TypeError, ValueError):
            weight = 1

        raw_edge_type = str(
            edge.get(
                "type",
                "corridor",
            )
        ).lower().strip()

        # Find the connected nodes
        source_node = next(
            (
                node
                for node in clean_nodes
                if node["id"] == source
            ),
            None,
        )

        target_node = next(
            (
                node
                for node in clean_nodes
                if node["id"] == target
            ),
            None,
        )

        connected_types = {
            source_node["type"]
            if source_node
            else "",
            target_node["type"]
            if target_node
            else "",
        }

        # Normalize AI-generated edge types
        if raw_edge_type == "door":
            edge_type = "corridor"

        elif raw_edge_type == "connection":

            if "elevator" in connected_types:
                edge_type = "elevator"

            elif "stairs" in connected_types:
                edge_type = "stairs"

            elif "ramp" in connected_types:
                edge_type = "ramp"

            else:
                edge_type = "corridor"

        elif raw_edge_type == "exit":
            edge_type = "corridor"

        elif raw_edge_type in {
            "corridor",
            "stairs",
            "elevator",
            "ramp",
        }:
            edge_type = raw_edge_type

        else:
            edge_type = "corridor"

        # If the AI returned a generic corridor connection,
        # infer special connections from the connected nodes.
        if edge_type == "corridor":

            if "elevator" in connected_types:
                edge_type = "elevator"

            elif "stairs" in connected_types:
                edge_type = "stairs"

            elif "ramp" in connected_types:
                edge_type = "ramp"

        # Stairs are not wheelchair accessible by default.
        # Elevators and ramps remain accessible unless explicitly
        # marked otherwise by the AI.
        accessible = bool(
            edge.get(
                "accessible",
                True,
            )
        )

        if edge_type == "stairs":
            accessible = False

        clean_edges.append(
            {
                "from": source,
                "to": target,
                "weight": max(
                    weight,
                    0.01,
                ),
                "type": edge_type,
                "accessible": accessible,
            }
        )

    # ---------------------------------------------------------
    # FALLBACK: INFER EDGES FROM SPATIAL PROXIMITY
    # ---------------------------------------------------------
    # If the AI returned no edges (or very few), generate them from
    # node positions so the graph is always connected.
    if len(clean_edges) < len(clean_nodes) - 1:
        inferred = _infer_edges(clean_nodes)
        existing = {
            tuple(sorted([e["from"], e["to"]]))
            for e in clean_edges
        }
        for ie in inferred:
            key = tuple(sorted([ie["from"], ie["to"]]))
            if key not in existing:
                clean_edges.append(ie)
                existing.add(key)
    # ---------------------------------------------------------
    # BUILDING / ANALYSIS
    # ---------------------------------------------------------

    building = result.get(
        "building",
        {},
    )

    if not isinstance(building, dict):
        building = {}

    analysis = result.get(
        "analysis",
        {},
    )

    if not isinstance(analysis, dict):
        analysis = {}

    floors = sorted(
        {
            node["floor"]
            for node in clean_nodes
        }
    )

    building_info = {
        "id": str(
            building.get(
                "id",
                "AI_BUILDING_1",
            )
        ),
        "name": str(
            building.get(
                "name",
                "AI Detected Building",
            )
        ),
        "floors": len(floors) or 1,
    }

    return {
        "building": building_info,
        "nodes": clean_nodes,
        "edges": clean_edges,
        "analysis": {
            "rooms_detected": int(
                analysis.get(
                    "rooms_detected",
                    sum(
                        node["type"] == "room"
                        for node in clean_nodes
                    ),
                )
            ),
            "doors_detected": int(
                analysis.get(
                    "doors_detected",
                    0,
                )
            ),
            "stairs_detected": int(
                analysis.get(
                    "stairs_detected",
                    sum(
                        node["type"] == "stairs"
                        for node in clean_nodes
                    ),
                )
            ),
            "elevators_detected": int(
                analysis.get(
                    "elevators_detected",
                    sum(
                        node["type"] == "elevator"
                        for node in clean_nodes
                    ),
                )
            ),
            "exits_detected": int(
                analysis.get(
                    "exits_detected",
                    sum(
                        node["type"] == "exit"
                        for node in clean_nodes
                    ),
                )
            ),
            "confidence": str(
                analysis.get(
                    "confidence",
                    "medium",
                )
            ),
            "warnings": (
                analysis.get(
                    "warnings",
                    [],
                )
                if isinstance(
                    analysis.get(
                        "warnings",
                        [],
                    ),
                    list,
                )
                else []
            ),
        },
    }

def analyze_floorplan(
    content: bytes,
    filename: str,
) -> dict[str, Any]:

    api_key = os.getenv(
        "OPENROUTER_API_KEY"
    )

    if not api_key:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not configured."
        )

    if not content:
        raise ValueError(
            "The uploaded floor-plan is empty."
        )

    data_url = _image_data_url(
        content,
        filename,
    )

    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {
                "role": "system",
                "content": SYSTEM_PROMPT,
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Analyze this floor plan "
                            "for S33 evacuation routing. "
                            "Return the required JSON."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": data_url,
                        },
                    },
                ],
            },
        ],
        "temperature": 0,
        "max_tokens": 1581,
    }

    response = requests.post(
        OPENROUTER_URL,
        headers={
            "Authorization": (
                f"Bearer {api_key}"
            ),
            "Content-Type": "application/json",
            "HTTP-Referer": (
                "http://localhost:3000"
            ),
            "X-Title": (
                "S33 Evacuation Digital Twin"
            ),
        },
        json=payload,
        timeout=120,
    )

    if not response.ok:
        try:
            detail = response.json()
        except Exception:
            detail = response.text

        raise RuntimeError(
            f"OpenRouter error "
            f"{response.status_code}: "
            f"{detail}"
        )

    data = response.json()

    try:
        text = data[
            "choices"
        ][0][
            "message"
        ][
            "content"
        ]
    except (
        KeyError,
        IndexError,
        TypeError,
    ) as error:
        raise RuntimeError(
            "OpenRouter returned an unexpected response."
        ) from error

    if not isinstance(text, str):
        raise RuntimeError(
            "Vision model did not return text."
        )

    result = _extract_json(text)
    print("========== RAW AI GRAPH ==========")
    print(json.dumps(result, indent=2))
    print("==================================")

    return _normalise_graph(result)