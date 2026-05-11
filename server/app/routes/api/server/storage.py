import subprocess
import json as _json
import re
from pathlib import Path
from fastapi import APIRouter
from app.routes.api.server.status import disk_info
from app.config import HOT_CACHE_PATH, COLD_STORAGE_PATH, HOT_CACHE_LABEL, COLD_STORAGE_LABEL, STORAGE_MODE

router = APIRouter()

HOT_LABEL  = Path(f"/dev/disk/by-label/{HOT_CACHE_LABEL}")
COLD_LABEL = Path(f"/dev/disk/by-label/{COLD_STORAGE_LABEL}")


def _resolve_dev(label_path: Path) -> str | None:
    try:
        return str(label_path.resolve())
    except Exception:
        return None


def _disk_smart(dev: str) -> dict:
    try:
        result = subprocess.run(
            ["sudo", "smartctl", "-H", "-i", "-A", "-j", dev],
            capture_output=True, text=True
        )
        return _json.loads(result.stdout)
    except Exception:
        return {}


def _hot_disks() -> list[dict]:
    dev = _resolve_dev(HOT_LABEL)
    if not dev:
        return []
    parent = re.sub(r'p?\d+$', '', dev.replace('/dev/', ''))
    try:
        out = subprocess.check_output(
            ["lsblk", "-J", "-o", "NAME,SIZE,MODEL", f"/dev/{parent}"],
            stderr=subprocess.DEVNULL, text=True
        )
        disks = []
        for d in _json.loads(out).get("blockdevices", []):
            smart_data = _disk_smart(f"/dev/{d['name']}")
            disks.append({
                "name": d["name"],
                "size": d.get("size"),
                "model": d.get("model"),
                "temp": smart_data.get("temperature", {}).get("current"),
                "power_on_hours": smart_data.get("power_on_time", {}).get("hours"),
                "passed": smart_data.get("smart_status", {}).get("passed"),
                "smart": smart_data,
            })
        return disks
    except Exception:
        return []


def _cold_disks_and_raid() -> tuple[list[dict], dict]:
    disks = []
    raid_detail = {}
    dev = _resolve_dev(COLD_LABEL)
    if not dev:
        return disks, raid_detail
    try:
        detail = subprocess.run(
            ["sudo", "mdadm", "--detail", dev],
            capture_output=True, text=True
        )
        for line in detail.stdout.splitlines():
            match = re.search(r'/dev/(sd[a-z]+)\s*$', line)
            if match:
                m = match.group(1)
                smart_data = _disk_smart(f"/dev/{m}")
                disks.append({
                    "name": m,
                    "temp": smart_data.get("temperature", {}).get("current"),
                    "power_on_hours": smart_data.get("power_on_time", {}).get("hours"),
                    "passed": smart_data.get("smart_status", {}).get("passed"),
                    "smart": smart_data,
                })
            if ":" in line:
                k, _, v = line.strip().partition(":")
                k = k.strip().lower().replace(" ", "_")
                if k in ("raid_level", "array_size", "raid_devices",
                         "active_devices", "state", "resync_status"):
                    raid_detail[k] = v.strip()
    except Exception:
        pass
    return disks, raid_detail


@router.get("/server/storage")
async def server_storage():
    result = {}

    if STORAGE_MODE in ("hot_cold", "hot_cold_raid"):
        hot = disk_info(str(HOT_CACHE_PATH))
        result["hot_cache"] = {**hot, "disks": _hot_disks(), "raid": False}

    if STORAGE_MODE == "hot_cold_raid":
        cold = disk_info(str(COLD_STORAGE_PATH))
        cold_disks, raid_detail = _cold_disks_and_raid()
        result["cold_storage"] = {**cold, "disks": cold_disks, "raid": True, "raid_detail": raid_detail}

    if STORAGE_MODE == "simple":
        simple = disk_info(str(HOT_CACHE_PATH))
        result["storage"] = {**simple, "disks": [], "raid": False}

    return result


@router.get("/server/isos")
async def list_isos():
    isos_path = Path("/srv/isos")
    try:
        isos = []
        for f in sorted(isos_path.rglob("*.iso")):
            category = f.parent.name if f.parent != isos_path else "outros"
            isos.append({
                "filename": f.name,
                "size": f.stat().st_size,
                "path": str(f),
                "category": category,
            })
        return {"isos": isos}
    except Exception as e:
        return {"isos": [], "error": str(e)}