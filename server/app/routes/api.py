"""Endpoints REST."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.state import state

router = APIRouter()


class CommandRequest(BaseModel):
    command: str


@router.get("/clients")
async def list_clients():
    """Lista todos os clientes conectados."""
    return [c.to_dict() for c in state.clients.values()]


@router.get("/clients/{mac}")
async def get_client(mac: str):
    """Detalhes de um cliente."""
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return client.to_dict()


@router.post("/clients/{mac}/command")
async def send_command(mac: str, payload: CommandRequest):
    """Envia um comando shell para o cliente executar."""
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    try:
        await client.websocket.send_json({
            "type": "command",
            "command": payload.command,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar: {e}")

    return {"status": "sent", "command": payload.command}

@router.post("/clients/{mac}/log/clear")
async def clear_log(mac: str):
    """Limpa o log de um cliente."""
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    client.log = []
    await state.broadcast_to_dashboard({
        "type": "client_update",
        "mac": mac,
        "client": client.to_dict(),
    })
    return {"status": "cleared"}

import shutil
import psutil
from pathlib import Path

@router.get("/server/status")
async def server_status():
    """Status em tempo real do servidor FORGE."""
    cpu = psutil.cpu_percent(interval=0.1)
    ram = psutil.virtual_memory()
    
    def disk_info(path):
        try:
            u = shutil.disk_usage(path)
            return {"total": u.total, "used": u.used, "free": u.free}
        except Exception:
            return {"total": 0, "used": 0, "free": 0, "error": "indisponível"}

    # RAID status via /proc/mdstat
    raid_status = "unknown"
    try:
        mdstat = Path("/proc/mdstat").read_text()
        if "[UU]" in mdstat:
            raid_status = "healthy"
        elif "resync" in mdstat or "recovery" in mdstat:
            raid_status = "syncing"
        else:
            raid_status = "degraded"
    except Exception:
        raid_status = "unknown"

    # Uptime
    uptime_s = int(Path("/proc/uptime").read_text().split()[0].split(".")[0])
    h, m = divmod(uptime_s // 60, 60)
    uptime = f"{h}h {m}m"

    # Temperatura CPU
    cpu_temp = None
    try:
        temps = psutil.sensors_temperatures()
        # Tenta k10temp (AMD) primeiro, depois coretemp (Intel), depois qualquer um
        for sensor in ("k10temp", "coretemp", "cpu_thermal"):
            if sensor in temps:
                entries = temps[sensor]
                # Pega a entrada "Tctl" ou "Tdie" ou a primeira disponível
                for entry in entries:
                    if entry.label in ("Tctl", "Tdie", "Package id 0", ""):
                        cpu_temp = round(entry.current, 1)
                        break
                if cpu_temp is not None:
                    break
        # Fallback: qualquer sensor disponível
        if cpu_temp is None and temps:
            first = next(iter(temps.values()))
            if first:
                cpu_temp = round(first[0].current, 1)
    except Exception:
        cpu_temp = None

    return {
        "cpu_percent": cpu,
        "cpu_temp": cpu_temp,
        "ram": {
            "total": ram.total,
            "used": ram.used,
            "percent": ram.percent,
        },
        "hot_cache": disk_info("/mnt/hot"),
        "cold_storage": disk_info("/mnt/cold"),
        "raid_status": raid_status,
        "uptime": uptime,
        "clients_connected": len(state.clients),
    }