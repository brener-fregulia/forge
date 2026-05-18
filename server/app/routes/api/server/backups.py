"""Endpoints REST — visualizacao de backups no storage."""
import json
from pathlib import Path
from fastapi import APIRouter
from app.config import HOT_CACHE_PATH, COLD_STORAGE_PATH
from app.forge_log import forge_log

router = APIRouter(tags=["storage"])


def _read_manifest(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text())
    except Exception:
        return None


def _scan_storage(base: Path) -> list[dict]:
    """Varre base/forge/{mac}/ e retorna lista de clientes com seus backups."""
    results = []
    forge_dir = base / "forge"
    if not forge_dir.exists():
        return results

    for mac_dir in sorted(forge_dir.iterdir()):
        if not mac_dir.is_dir():
            continue

        mac = mac_dir.name
        backups = []

        for item in sorted(mac_dir.iterdir(), reverse=True):
            if item.name == "manifest.json":
                continue

            manifest_path = mac_dir / "manifest.json"
            manifest = _read_manifest(manifest_path) if manifest_path.exists() else {}

            # Verifica se é o backup mais recente pelo job_id no manifest
            is_current = manifest.get("file") == item.name

            if item.is_file() and item.suffix in (".img", ".zst"):
                backups.append({
                    "name":    item.name,
                    "type":    "file",
                    "mode":    "raw" if item.suffix == ".img" else "compressed",
                    "size":    item.stat().st_size,
                    "mtime":   item.stat().st_mtime,
                    "manifest": manifest if is_current else {},
                })
            elif item.is_dir() and item.name.startswith("minimal_"):
                size = sum(f.stat().st_size for f in item.rglob("*") if f.is_file())
                backups.append({
                    "name":    item.name,
                    "type":    "dir",
                    "mode":    "minimal",
                    "size":    size,
                    "mtime":   item.stat().st_mtime,
                    "manifest": manifest if is_current else {},
                })

        if backups:
            results.append({
                "mac":     mac,
                "backups": backups,
            })

    return results


@router.get("/server/backups/hot")
async def storage_hot():
    return {"clients": _scan_storage(HOT_CACHE_PATH)}


@router.get("/server/backups/cold")
async def storage_cold():
    return {"clients": _scan_storage(COLD_STORAGE_PATH)}