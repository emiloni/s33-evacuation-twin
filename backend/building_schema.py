from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class BuildingNode(BaseModel):
    id: str
    x: float
    y: float
    type: str
    floor: int = 1
    label: Optional[str] = None


class BuildingEdge(BaseModel):
    model_config = ConfigDict(
        validate_by_name=True,
        validate_by_alias=True,
    )

    from_node: str = Field(
        ...,
        alias="from",
    )

    to_node: str = Field(
        ...,
        alias="to",
    )

    weight: float = 1

    type: str = "corridor"

    accessible: bool = True


class BuildingDataset(BaseModel):
    building: dict

    nodes: List[BuildingNode]

    edges: List[BuildingEdge]