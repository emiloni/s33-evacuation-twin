from typing import Dict, Any, Optional


_active_building: Optional[Dict[str, Any]] = None


def set_active_building(
    building: Dict[str, Any]
) -> None:
    global _active_building

    _active_building = building


def get_active_building() -> Optional[Dict[str, Any]]:
    return _active_building


def clear_active_building() -> None:
    global _active_building

    _active_building = None