from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
)

from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from backend.auth.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    name = Column(
        String(100),
        nullable=False,
    )

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    password_hash = Column(
        String(255),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    simulations = relationship(
    "SavedSimulation",
    back_populates="user",
    cascade="all, delete-orphan",
    )

    buildings = relationship(
    "SavedBuilding",
    back_populates="user",
    cascade="all, delete-orphan",
    )

from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
)

from datetime import datetime, timezone

from sqlalchemy.orm import relationship


class SavedSimulation(Base):
    __tablename__ = "saved_simulations"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    building_name = Column(
        String(255),
        nullable=True,
    )

    start_node = Column(
        String(100),
        nullable=False,
    )

    destination = Column(
        String(100),
        nullable=True,
    )

    mobility = Column(
        String(50),
        nullable=False,
        default="normal",
    )

    scenario = Column(
        String(50),
        nullable=False,
        default="normal",
    )

    route = Column(
        Text,
        nullable=False,
    )

    hazards = Column(
        Text,
        nullable=True,
    )

    confidence = Column(
        String(20),
        nullable=True,
    )

    mode = Column(
        String(50),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(
            timezone.utc
        ),
    )

    user = relationship(
        "User",
        back_populates="simulations",
    )

class SavedBuilding(Base):
    __tablename__ = "saved_buildings"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    name = Column(
        String(255),
        nullable=False,
        default="Uploaded Building",
    )

    building_json = Column(
        Text,
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )

    user = relationship(
        "User",
        back_populates="buildings",
    )