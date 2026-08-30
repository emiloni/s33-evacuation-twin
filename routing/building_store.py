import json
from typing import Dict, Any, Optional


_active_building: Optional[Dict[str, Any]] = None


def set_active_building(
    building: Dict[str, Any]
) -> None:
    global _active_building
    _active_building = building


def get_active_building() -> Optional[Dict[str, Any]]:
    global _active_building

    # ---------------------------------------------------------
    # If the in-memory store is empty (e.g. after a server
    # restart), try to reload the most recently saved building
    # from the database.
    # ---------------------------------------------------------
    if _active_building is None:
        try:
            from backend.auth.database import (
                get_db,
            )
            from backend.auth.models import (
                SavedBuilding,
            )
            from sqlalchemy import desc

            db = next(get_db())
            latest = (
                db.query(SavedBuilding)
                .order_by(desc(SavedBuilding.created_at))
                .first()
            )
            if latest and latest.building_json:
                _active_building = json.loads(
                    latest.building_json
                )
                # If the stored building has sparse edges
                # (e.g. old saves before edge inference),
                # infer missing edges from node positions.
                stored_edges = _active_building.get("edges", [])
                stored_nodes = _active_building.get("nodes", [])
                if (
                    len(stored_edges)
                    < len(stored_nodes) - 1
                    and stored_nodes
                ):
                    try:
                        from backend.building_service import (
                            _infer_edges_from_nodes,
                        )
                        inferred = (
                            _infer_edges_from_nodes(
                                stored_nodes
                            )
                        )
                        existing = {
                            tuple(sorted([e["from"], e["to"]]))
                            for e in stored_edges
                        }
                        for ie in inferred:
                            key = tuple(sorted(
                                [ie["from"], ie["to"]]
                            ))
                            if key not in existing:
                                stored_edges.append(ie)
                                existing.add(key)
                        _active_building["edges"] = stored_edges
                    except Exception:
                        pass
                print(
                    "[building_store] Auto-loaded building"
                    f" from DB: id={latest.id}"
                    f" name={latest.name}"
                    f" nodes={len(stored_nodes)}"
                    f" edges={len(_active_building.get('edges', []))}"
                )
        except Exception as e:
            print(
                f"[building_store] Failed to auto-load"
                f" building from DB: {e}"
            )

    return _active_building


def clear_active_building() -> None:
    global _active_building
    _active_building = None