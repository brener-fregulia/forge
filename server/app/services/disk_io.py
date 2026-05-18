"""Monitor de I/O de discos em tempo real via /proc/diskstats."""
import asyncio
from pathlib import Path
from app.services.forge_log import forge_log

SECTOR_SIZE = 512

THROUGHPUT_CEILING = {
    "nvme": 3000,
    "ssd":  500,
    "hdd":  150,
}

_io_state: dict[str, dict] = {}
_prev_stats: dict[str, tuple] = {}


def _disk_type(name: str) -> str:
    if name.startswith("nvme"):
        return "nvme"
    rot_path = Path(f"/sys/class/block/{name}/queue/rotational")
    try:
        return "hdd" if rot_path.read_text().strip() == "1" else "ssd"
    except Exception:
        return "hdd"


def _read_diskstats() -> dict[str, tuple]:
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
    except Exception as e:
        forge_log("disk_io", f"erro ao ler diskstats: {e}")
    return stats


async def io_monitor_loop(interval: float = 1.0) -> None:
    global _prev_stats
    forge_log("disk_io", "monitor iniciado")
    _prev_stats = _read_diskstats()
    while True:
        await asyncio.sleep(interval)
        try:
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
        except Exception as e:
            forge_log("disk_io", f"erro: {e}")


def get_io(disks: list[str]) -> dict:
    return {d: _io_state.get(d, {"read_mb": 0, "write_mb": 0, "total_mb": 0, "pct": 0}) for d in disks}