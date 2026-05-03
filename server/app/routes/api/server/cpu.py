import psutil
from pathlib import Path
from fastapi import APIRouter
from app.routes.api.server.status import cpu_temp

router = APIRouter()


def _cpu_fan_rpm() -> int | None:
    try:
        fans = psutil.sensors_fans()
        for entries in fans.values():
            for entry in entries:
                if entry.current > 0:
                    return int(entry.current)
    except Exception:
        pass
    return None


def _cpu_name() -> str:
    try:
        for line in Path("/proc/cpuinfo").read_text().splitlines():
            if "model name" in line:
                return line.split(":")[1].strip()
    except Exception:
        pass
    return ""


@router.get("/server/cpu")
async def server_cpu():
    # Coleta única com interval
    percent = psutil.cpu_percent(interval=0.5)
    per_cpu = psutil.cpu_percent(interval=None, percpu=True)
    freq = psutil.cpu_freq()
    cpu_times = psutil.cpu_times_percent(interval=None)
    return {
        "name": _cpu_name(),
        "physical_cores": psutil.cpu_count(logical=False),
        "logical_cores": psutil.cpu_count(logical=True),
        "percent": percent,
        "per_core": per_cpu,
        "temp": cpu_temp(),
        "fan_rpm": _cpu_fan_rpm(),
        "freq_current": round(freq.current) if freq else None,
        "freq_max": round(freq.max) if freq else None,
        "times": {
            "user": cpu_times.user,
            "system": cpu_times.system,
            "idle": cpu_times.idle,
        },
    }