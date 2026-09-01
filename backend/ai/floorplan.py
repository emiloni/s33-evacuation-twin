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
- Detect RAMP elements as a distinct type (see RAMP DETECTION below).
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

RAMP DETECTION:
If the floor plan contains a clearly labelled RAMP (e.g. text "RAMP",
"Accessible Ramp", or a sloped rectangular area), you MUST:
1. Create a node with type "ramp".
2. Give it a unique ID like "F1_RAMP_MAIN" or "F1_RAMP_1".
3. Set accessible=true.
4. Place the node at the ramp's CENTER coordinates (x, y).
5. Include a "vertices" array with the 4 corner coordinates of the
   visible ramp area. For a rectangular ramp:
   vertices = [
     {x: left, y: top},
     {x: right, y: top},
     {x: right, y: bottom},
     {x: left, y: bottom}
   ]
   The vertices MUST represent the actual visible boundary of the ramp.
6. Connect it to the nearest corridor node with an edge of type "ramp".
7. Include it in the analysis.ramps_detected count.

A ramp is an accessible navigation element (sloped surface for wheelchair
access). It must NOT be classified as a room, corridor, stairs, or exit.

The vertices are CRITICAL for frontend 3D rendering. Without vertices,
the ramp cannot be displayed as a visible sloped surface.

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
    },
    {
      "id": "F1_RAMP_MAIN",
      "x": 500,
      "y": 300,
      "type": "ramp",
      "floor": 1,
      "label": "Accessible Ramp",
      "accessible": true,
      "vertices": [
        {"x": 450, "y": 280},
        {"x": 550, "y": 280},
        {"x": 550, "y": 340},
        {"x": 450, "y": 340}
      ]
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
    "ramps_detected": 0,
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
- ramp
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

For ramps:
- Use type "ramp".
- Label them clearly, for example "Accessible Ramp", "Ramp to Exit".
- Set accessible=true (ramps are always accessible by design).
- Connect the ramp to the nearest corridor or navigation node.

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
    """
    Infer edges from spatial proximity when the AI returns few or no edges.

    This is a fallback: when the vision model fails to output connectivity,
    we connect nodes based on their 2D positions and types.
    """

    if not nodes:
        return []

    def _dist(a: dict, b: dict) -> float:
        return math.hypot(
            a["x"] - b["x"],
            a["y"] - b["y"],
        )

    edges: list[dict] = []
    edge_set: set[tuple[str, str]] = set()

    def _add_edge(
        src: dict,
        dst: dict,
        etype: str,
        accessible: bool = True,
        door_x: float | None = None,
        door_y: float | None = None,
    ) -> None:

        key = tuple(sorted([src["id"], dst["id"]]))

        if key in edge_set or src["id"] == dst["id"]:
            return

        edge_set.add(key)

        edge = {
            "from": src["id"],
            "to": dst["id"],
            "weight": round(_dist(src, dst), 1),
            "type": etype,
            "accessible": accessible,
        }

        # Preserve door/opening coordinates when available.
        if door_x is not None and door_y is not None:
            edge["door_x"] = door_x
            edge["door_y"] = door_y

        edges.append(edge)

    # ---------------------------------------------------------
    # Classify nodes by type
    # ---------------------------------------------------------

    corridors = [
        n for n in nodes
        if n.get("type") == "corridor"
    ]

    rooms = [
        n for n in nodes
        if n.get("type") == "room"
    ]

    stairs = [
        n for n in nodes
        if n.get("type") == "stairs"
    ]

    elevators = [
        n for n in nodes
        if n.get("type") == "elevator"
    ]

    exits = [
        n for n in nodes
        if n.get("type") == "exit"
    ]

    junctions = [
        n for n in nodes
        if n.get("type") in ("junction", "entrance")
    ]

    ramps = [
        n for n in nodes
        if n.get("type") == "ramp"
    ]

    # All walkable non-exit nodes
    walkable = (
        corridors
        + rooms
        + stairs
        + elevators
        + ramps
        + junctions
    )

    # ---------------------------------------------------------
    # 1) Connect every room to the nearest corridor
    # ---------------------------------------------------------

    for room in rooms:

        same_floor_corridors = [
            c for c in corridors
            if c.get("floor") == room.get("floor")
        ]

        if same_floor_corridors:

            nearest = min(
                same_floor_corridors,
                key=lambda c: _dist(room, c),
            )

            # Fallback door location.
            # Midpoint between room and corridor.
            # Real AI-detected door coordinates are preferred
            # when they are available.
            door_x = (
                room["x"] + nearest["x"]
            ) / 2

            door_y = (
                room["y"] + nearest["y"]
            ) / 2

            _add_edge(
                room,
                nearest,
                "corridor",
                accessible=True,
                door_x=door_x,
                door_y=door_y,
            )

    # ---------------------------------------------------------
    # 2) Connect corridors to nearest corridors
    # ---------------------------------------------------------

    for i, c1 in enumerate(corridors):

        same_floor_others = [
            c2
            for j, c2 in enumerate(corridors)
            if j != i
            and c2.get("floor") == c1.get("floor")
        ]

        if same_floor_others:

            nearest = min(
                same_floor_others,
                key=lambda c: _dist(c1, c),
            )

            _add_edge(
                c1,
                nearest,
                "corridor",
                accessible=True,
            )

    # ---------------------------------------------------------
    # 3) Connect stairs/elevators/ramps to nearest corridor
    # ---------------------------------------------------------

    for node in stairs + elevators + ramps:

        same_floor_corridors = [
            c for c in corridors
            if c.get("floor") == node.get("floor")
        ]

        if same_floor_corridors:

            nearest = min(
                same_floor_corridors,
                key=lambda c: _dist(node, c),
            )

            etype = node.get(
                "type",
                "corridor",
            )

            acc = etype != "stairs"

            _add_edge(
                node,
                nearest,
                etype,
                accessible=acc,
            )

    # ---------------------------------------------------------
    # 4) Connect matching stairs/elevators between floors
    # ---------------------------------------------------------

    for s1 in stairs + elevators:

        for s2 in stairs + elevators:

            if s1["id"] == s2["id"]:
                continue

            if s1.get("floor") != s2.get("floor"):

                label1 = s1.get(
                    "label",
                    "",
                ).upper()

                label2 = s2.get(
                    "label",
                    "",
                ).upper()

                prefix1 = re.sub(
                    r"\d+.*$",
                    "",
                    label1,
                ).strip()

                prefix2 = re.sub(
                    r"\d+.*$",
                    "",
                    label2,
                ).strip()

                if prefix1 and prefix1 == prefix2:

                    etype = s1.get(
                        "type",
                        "corridor",
                    )

                    acc = etype != "stairs"

                    _add_edge(
                        s1,
                        s2,
                        etype,
                        accessible=acc,
                    )

    # ---------------------------------------------------------
    # 5) Connect exits to nearest corridor
    # ---------------------------------------------------------

    for exit_node in exits:

        if corridors:

            nearest_corridor = min(
                corridors,
                key=lambda c: _dist(
                    exit_node,
                    c,
                ),
            )

            _add_edge(
                exit_node,
                nearest_corridor,
                "corridor",
                accessible=True,
            )

        elif stairs + elevators:

            candidates = (
                stairs
                + elevators
            )

            nearest = min(
                candidates,
                key=lambda c: _dist(
                    exit_node,
                    c,
                ),
            )

            _add_edge(
                exit_node,
                nearest,
                "corridor",
                accessible=True,
            )

    # ---------------------------------------------------------
    # 6) If no corridors exist, connect rooms directly
    # ---------------------------------------------------------

    if not corridors:

        for room in rooms:

            others = [
                n for n in walkable
                if n["id"] != room["id"]
            ]

            if others:

                nearest = min(
                    others,
                    key=lambda n: _dist(
                        room,
                        n,
                    ),
                )

                _add_edge(
                    room,
                    nearest,
                    "corridor",
                    accessible=True,
                )

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

        # FORCE-CORRECT: If label or ID contains RAMP, override type
        label_str = str(node.get("label", "")).lower()
        id_str = node_id.lower()
        if "ramp" in label_str or "ramp" in id_str:
            if node_type != "ramp":
                print(f"[AI] RAMP CORRECTED: {node_id} type '{node_type}' -> 'ramp' (label: {node.get('label', 'N/A')})")
            node_type = "ramp"

        clean_node = {
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

        # Preserve vertices for ramp nodes (needed for 3D rendering)
        if node_type == "ramp":
            raw_vertices = node.get("vertices", [])
            if isinstance(raw_vertices, list) and len(raw_vertices) >= 3:
                clean_vertices = []
                for v in raw_vertices:
                    if isinstance(v, dict):
                        try:
                            vx = float(v.get("x", 0))
                            vy = float(v.get("y", 0))
                            clean_vertices.append({"x": vx, "y": vy})
                        except (TypeError, ValueError):
                            pass
                if len(clean_vertices) >= 3:
                    clean_node["vertices"] = clean_vertices
            clean_node["accessible"] = True

        clean_nodes.append(clean_node)

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

        # FORCE-CORRECT: If either endpoint is a ramp node,
        # the edge must be type "ramp" and accessible.
        source_is_ramp = source_node and source_node.get("type") == "ramp"
        target_is_ramp = target_node and target_node.get("type") == "ramp"
        if source_is_ramp or target_is_ramp:
            if edge_type != "ramp":
                print(f"[AI] RAMP EDGE CORRECTED: {source} -> {target} type '{edge_type}' -> 'ramp'")
            edge_type = "ramp"
            accessible = True

        clean_edge = {
            
            "from": source,
            "to": target,
            "weight": max(
                     weight,
        0.01,
    ),
    "type": edge_type,
    "accessible": accessible,
}

# Preserve detected door/opening coordinates.
        try:

           if edge.get("door_x") is not None:
                         clean_edge["door_x"] = float(edge["door_x"])

           if edge.get("door_y") is not None:
                    clean_edge["door_y"] = float(edge["door_y"])

        except (TypeError, ValueError):
                  pass

        clean_edges.append(clean_edge)
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

    # Debug: log ramp detection results
    ramp_nodes = [n for n in clean_nodes if n["type"] == "ramp"]
    ramp_edges = [e for e in clean_edges if e["type"] == "ramp"]

    for rn in ramp_nodes:
        print("[GRAPH] RAMP NODE:")
        print("  id:", rn["id"])
        print("  type:", rn["type"])
        print("  accessible:", rn.get("accessible", "not set"))
        print("  position: (%s, %s)" % (rn["x"], rn["y"]))
        print("  label:", rn.get("label", "N/A"))
        if "vertices" in rn:
            print("  vertices:", rn["vertices"])
    for re_edge in ramp_edges:
        print("[GRAPH] RAMP EDGE:")
        print("  from:", re_edge["from"], "-> to:", re_edge["to"])
        print("  type:", re_edge["type"])
        print("  accessible:", re_edge.get("accessible", "not set"))
    print("")
    print("[AI PARSE] Total elements:", len(clean_nodes), "nodes,", len(clean_edges), "edges")
    print("[AI PARSE] Ramps detected:", len(ramp_nodes))
    for rn in ramp_nodes:
        print("[AI PARSE] RAMP FOUND")
        print("  ID:", rn["id"])
        print("  Floor:", rn["floor"])
        print("  Type:", rn["type"])
        print("  Position: (%s, %s)" % (rn["x"], rn["y"]))
        print("  Label:", rn.get("label", "N/A"))
    if ramp_edges:
        print("[AI PARSE] Ramp edges:", len(ramp_edges))
        for re_edge in ramp_edges:
            print("  %s -> %s (type: %s, accessible: %s)" % (
                re_edge["from"], re_edge["to"],
                re_edge["type"], re_edge.get("accessible", True)
            ))

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
            "ramps_detected": int(
                analysis.get(
                    "ramps_detected",
                    sum(
                        node["type"] == "ramp"
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
        "max_tokens": 4000,
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