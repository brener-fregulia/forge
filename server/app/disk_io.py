"""Monitor de I/O de discos em tempo real via /proc/diskstats."""
import asyncio
from pathlib import Path

# Setores de 512 bytes
SECTOR_SIZE = 512

# Tetos por tipo (MB/s)
THROUGHPUT_CEILING = {
    "nvme": 3000,
    "ssd":  500,
    "hdd":  150,
}

# Estado: { disk_name: { "read_mb": float, "write_mb": float, "pct": float, "type": str } }
_io_state: dict[str, dict] = {}
_prev_stats: dict[str, tuple] = {}  # { disk_name: (read_sectors, write_sectors) }


def _disk_type(name: str) -> str:
    """Detecta tipo do disco pelo nome e rotation_rate via sysfs."""
    # NVMe
    if name.startswith("nvme"):
        return "nvme"
    # Verifica rotational
    rot_path = Path(f"/sys/class/block/{name}/queue/rotational")
    try:
        return "hdd" if rot_path.read_text().strip() == "1" else "ssd"
    except Exception:
        return "hdd"


def _read_diskstats() -> dict[str, tuple]:
    """Lê /proc/diskstats e retorna { name: (read_sectors, write_sectors) }."""
    stats = {}
    try:
        for line in Path("/proc/diskstats").read_text().splitlines():
            parts = line.split()
            if len(parts) < 14:
                continue
            name          = parts[2]
            read_sectors  = int(parts[5])
            write_sectors = int(parts[9])
            stats[name]   = (read_sectors, write_sectors)
    except Exception:
        pass
    return stats


async def io_monitor_loop(interval: float = 1.0) -> None:
    """Background task — atualiza _io_state a cada intervalo."""
    global _prev_stats
    _prev_stats = _read_diskstats()
    while True:
        await asyncio.sleep(interval)
        current = _read_diskstats()
        for name, (r, w) in current.items():
            prev_r, prev_w = _prev_stats.get(name, (r, w))
            read_mb  = (r - prev_r) * SECTOR_SIZE / 1024 / 1024 / interval
            write_mb = (w - prev_w) * SECTOR_SIZE / 1024 / 1024 / interval
            dtype    = _disk_type(name)
            ceiling  = THROUGHPUT_CEILING.get(dtype, 150)
            total_mb = read_mb + write_mb
            pct      = min(round(total_mb / ceiling * 100, 1), 100)
            _io_state[name] = {
                "read_mb":  round(read_mb, 2),
                "write_mb": round(write_mb, 2),
                "total_mb": round(total_mb, 2),
                "type":     dtype,
                "ceiling":  ceiling,
                "pct":      pct,
            }
        _prev_stats = current


def get_io(disks: list[str]) -> dict:
    """Retorna estado atual de I/O para os discos solicitados."""
    return {d: _io_state.get(d, {"read_mb": 0, "write_mb": 0, "total_mb": 0, "pct": 0}) for d in disks}