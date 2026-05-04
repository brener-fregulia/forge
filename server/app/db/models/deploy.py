"""Modelos de Deploy e Snapshot."""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, JSON, Enum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum as pyenum
from app.db.base import Base


class DeployStatus(pyenum.Enum):
    pending  = "pending"
    backup   = "backup"
    format   = "format"
    install  = "install"
    restore  = "restore"
    done     = "done"
    failed   = "failed"


class Deploy(Base):
    """Registro de uma operação de deploy em uma máquina."""
    __tablename__ = "deploys"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    machine_id: Mapped[str] = mapped_column(String, ForeignKey("machines.id"), nullable=False)
    status: Mapped[DeployStatus] = mapped_column(Enum(DeployStatus), default=DeployStatus.pending)
    started_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    backup_path: Mapped[str | None] = mapped_column(String, nullable=True)
    notes: Mapped[str | None] = mapped_column(String, nullable=True)

    machine: Mapped["Machine"] = relationship("Machine", back_populates="deploys")
    snapshots: Mapped[list["Snapshot"]] = relationship("Snapshot", back_populates="deploy")


class Snapshot(Base):
    """Inventário capturado em um deploy."""
    __tablename__ = "snapshots"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    deploy_id: Mapped[str] = mapped_column(String, ForeignKey("deploys.id"), nullable=False)
    disks: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    users: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    programs: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    smart: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    captured_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    deploy: Mapped["Deploy"] = relationship("Deploy", back_populates="snapshots")