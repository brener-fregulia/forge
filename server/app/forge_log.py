"""Logger centralizado do FORGE — buffer circular por categoria."""
from collections import deque
from datetime import datetime

CATEGORIES = ("switch", "disk_io", "agent", "system", "error")
BUFFER_SIZE = 200

_buffers: dict[str, deque] = {cat: deque(maxlen=BUFFER_SIZE) for cat in CATEGORIES}


def forge_log(category: str, message: str) -> None:
    if category not in _buffers:
        category = "system"
    entry = f"[{datetime.now().strftime('%H:%M:%S')}] {message}"
    _buffers[category].append(entry)


def get_logs(category: str, n: int = 200) -> list[str]:
    buf = _buffers.get(category, _buffers["system"])
    return list(buf)[-n:]


def get_all_logs(n: int = 200) -> dict[str, list[str]]:
    return {cat: list(buf)[-n:] for cat, buf in _buffers.items()}