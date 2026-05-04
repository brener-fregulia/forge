"""Serviço de acesso a Machine no banco."""
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.client import Machine


async def get_or_create_machine(db: AsyncSession, mac: str, hostname: str | None = None) -> Machine:
    """Busca máquina pelo MAC ou cria se não existir."""
    result = await db.execute(select(Machine).where(Machine.mac == mac))
    machine = result.scalar_one_or_none()

    if machine is None:
        machine = Machine(mac=mac, hostname=hostname)
        db.add(machine)
        await db.commit()
        await db.refresh(machine)
    else:
        machine.last_seen = datetime.now()
        machine.hostname = hostname or machine.hostname
        await db.commit()

    return machine


async def update_machine_hardware(db: AsyncSession, mac: str, hardware: dict) -> None:
    """Atualiza hardware da máquina."""
    result = await db.execute(select(Machine).where(Machine.mac == mac))
    machine = result.scalar_one_or_none()
    if machine:
        machine.hardware = hardware
        await db.commit()


async def set_machine_alias(db: AsyncSession, mac: str, alias: str) -> Machine | None:
    """Define alias (nome amigável) para a máquina."""
    result = await db.execute(select(Machine).where(Machine.mac == mac))
    machine = result.scalar_one_or_none()
    if machine:
        machine.alias = alias
        await db.commit()
        await db.refresh(machine)
    return machine