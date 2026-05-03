import subprocess
import json as _json
import re
from pathlib import Path
from fastapi import APIRouter
from app.routes.api.server.status import disk_info

router = APIRouter()


def _disk_smart(dev: str) -> dict:
    try:
        out = subprocess.check_output(
            ["smartctl", "-H", "-i", "-j", dev],
            stderr=subprocess.DEVNULL, text=True
        )
        data = _json.loads(out)
        return {
            "passed": data.get("smart_status", {}).get("passed"),
            "model": data.get("model_name", ""),
            "serial": data.get("serial_number", ""),
            "temp": data.get("temperature", {}).get("current"),
            "power_on_hours": data.get("power_on_time", {}).get("hours"),
        }
    except Exception:
        return {}


def _hot_disks() -> list[dict]:
    try:
        out = subprocess.check_output(
            ["lsblk", "-J", "-o", "NAME,SIZE,MODEL", "/dev/sdb"],
            stderr=subprocess.DEVNULL, text=True
        )
        disks = []
        for d in _json.loads(out).get("blockdevices", []):
            smart = _disk_smart(f"/dev/{d['name']}")
            disks.append({**d, **smart})
        return disks
    except Exception:
        return []


def _cold_disks_and_raid() -> tuple[list[dict], dict]:
    disks = []
    raid_detail = {}
    try:
        mdstat = Path("/proc/mdstat").read_text()
        for line in mdstat.splitlines():
            if "md0" in line:
                members = re.findall(r'sd[a-z]+', line)
                for m in members:
                    smart = _disk_smart(f"/dev/{m}")
                    disks.append({"name": m, **smart})
        detail = subprocess.check_output(
            ["sudo", "mdadm", "--detail", "/dev/md0"],
            stderr=subprocess.DEVNULL, text=True
        )
        for line in detail.splitlines():
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
    hot = disk_info("/mnt/hot")
    cold = disk_info("/mnt/cold")
    cold_disks, raid_detail = _cold_disks_and_raid()
    return {
        "hot_cache": {**hot, "disks": _hot_disks(), "raid": False},
        "cold_storage": {**cold, "disks": cold_disks, "raid": True, "raid_detail": raid_detail},
    }