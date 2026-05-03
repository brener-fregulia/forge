"""Endpoints REST — status e configuração do servidor FORGE."""
import shutil
import psutil
from pathlib import Path
from fastapi import APIRouter

router = APIRouter()


def _disk_info(path: str) -> dict:
    try:
        u = shutil.disk_usage(path)
        return {"total": u.total, "used": u.used, "free": u.free}
    except Exception:
        return {"total": 0, "used": 0, "free": 0, "error": "indisponível"}


def _raid_status() -> str:
    try:
        mdstat = Path("/proc/mdstat").read_text()
        if "[UU]" in mdstat:
            return "healthy"
        if "resync" in mdstat or "recovery" in mdstat:
            return "syncing"
        return "degraded"
    except Exception:
        return "unknown"


def _cpu_temp() -> float | None:
    try:
        temps = psutil.sensors_temperatures()
        for sensor in ("k10temp", "coretemp", "cpu_thermal"):
            if sensor in temps:
                for entry in temps[sensor]:
                    if entry.label in ("Tctl", "Tdie", "Package id 0", ""):
                        return round(entry.current, 1)
        if temps:
            first = next(iter(temps.values()))
            if first:
                return round(first[0].current, 1)
    except Exception:
        pass
    return None


def _uptime() -> str:
    uptime_s = int(Path("/proc/uptime").read_text().split()[0].split(".")[0])
    h, m = divmod(uptime_s // 60, 60)
    return f"{h}h {m}m"


@router.get("/server/status")
async def server_status():
    """Status em tempo real do servidor FORGE."""
    cpu = psutil.cpu_percent(interval=0.1)
    ram = psutil.virtual_memory()
    return {
        "cpu_percent": cpu,
        "cpu_temp": _cpu_temp(),
        "ram": {"total": ram.total, "used": ram.used, "percent": ram.percent},
        "hot_cache": _disk_info("/mnt/hot"),
        "cold_storage": _disk_info("/mnt/cold"),
        "raid_status": _raid_status(),
        "uptime": _uptime(),
    }