import base64
import json
import os
import re
from typing import Any

import requests


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
      "accessible": true
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

    raise ValueError(
        "AI returned invalid JSON."
    )


def _normalise_graph(
    result: dict[str, Any],
) -> dict[str, Any]:

    nodes = result.get(
        "nodes",
        [],
    )

    edges = result.get(
        "edges",
        [],
    )

    clean_nodes = []
    node_ids = set()

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
            node_id = (
                f"{node_id}_{index + 1}"
            )

        node_ids.add(node_id)

        try:
            x = float(
                node.get("x", 0)
            )
        except (TypeError, ValueError):
            x = 0

        try:
            y = float(
                node.get("y", 0)
            )
        except (TypeError, ValueError):
            y = 0

        try:
            floor = int(
                node.get("floor", 1)
            )
        except (TypeError, ValueError):
            floor = 1

        clean_nodes.append(
            {
                "id": node_id,
                "x": x,
                "y": y,
                "type": str(
                    node.get(
                        "type",
                        "junction",
                    )
                ),
                "floor": floor,
                "label": str(
                    node.get(
                        "label",
                        node_id,
                    )
                ),
            }
        )

    clean_edges = []

    for edge in edges:

        if not isinstance(edge, dict):
            continue

        source = str(
            edge.get(
                "from",
                "",
            )
        )

        target = str(
            edge.get(
                "to",
                "",
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

        clean_edges.append(
            {
                "from": source,
                "to": target,
                "weight": max(
                    weight,
                    0.01,
                ),
                "type": str(
                    edge.get(
                        "type",
                        "corridor",
                    )
                ),
                "accessible": bool(
                    edge.get(
                        "accessible",
                        True,
                    )
                ),
            }
        )

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
                        node["type"] == "stair"
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
        "max_tokens": 12000,
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

    return _normalise_graph(result)