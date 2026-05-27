"""Modelos de Client e Machine."""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Client(Base):
    """Entidade cliente - pessoa física ou jurídica."""
    __tablename__ = "clients"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    alias: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    machines: Mapped[list["Machine"]] = relationship("Machine", back_populates="client")


class Machine(Base):
    """Entidade máquina - identificada pelo MAC address."""
    __tablename__ = "machines"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    client_id: Mapped[str | None] = mapped_column(String, ForeignKey("clients.id"), nullable=True)
    mac: Mapped[str] = mapped_column(String(17), unique=True, nullable=False)
    alias: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hostname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hardware: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    last_seen: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    client: Mapped["Client | None"] = relationship("Client", back_populates="machines")
    deploys: Mapped[list["Deploy"]] = relationship("Deploy", back_populates="machine")