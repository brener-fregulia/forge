import subprocess
import psutil
from fastapi import APIRouter

router = APIRouter()


def _parse_dmidecode() -> list[dict]:
    slots = []
    try:
        out = subprocess.check_output(
            ["sudo", "dmidecode", "--type", "memory"],
            stderr=subprocess.DEVNULL, text=True
        )
        current = {}
        fields = {
            "Size:": "size", "Locator:": "locator",
            "Bank Locator:": "bank", "Type:": "type",
            "Speed:": "speed", "Manufacturer:": "manufacturer",
            "Part Number:": "part_number",
            "Configured Memory Speed:": "configured_speed",
        }
        for line in out.splitlines():
            line = line.strip()
            if line.startswith("Memory Device"):
                if current:
                    slots.append(current)
                current = {}
            for key, field in fields.items():
                if line.startswith(key):
                    if key == "Locator:" and "Bank" in line:
                        continue
                    current[field] = line[len(key):].strip()
        if current:
            slots.append(current)
    except Exception as e:
        return [{"error": str(e)}]
    return slots


@router.get("/server/ram")
async def server_ram():
    vm = psutil.virtual_memory()
    slots = _parse_dmidecode()
    populated = [s for s in slots if s.get("size", "No Module") != "No Module Installed"]
    return {
        "total": vm.total,
        "used": vm.used,
        "available": vm.available,
        "percent": vm.percent,
        "slots_total": len(slots),
        "slots_used": len(populated),
        "modules": populated,
    }