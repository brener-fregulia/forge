"""Endpoints REST — visualizacao de backups no storage."""
import json
import shutil
from pathlib import Path
from fastapi import APIRouter, HTTPException
from app.config import HOT_CACHE_PATH, COLD_STORAGE_PATH
from app.services.forge_log import forge_log

router = APIRouter(tags=["storage"])


def _read_manifest(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text())
    except Exception:
        return None


def _scan_storage(base: Path) -> list[dict]:
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
            # Ignora manifests
            if item.name.endswith(".manifest.json"):
                continue

            # Resolve manifest por backup
            if item.is_file() and item.suffix == ".img":
                manifest_path = mac_dir / f"{item.stem}.manifest.json"
                mode = "raw"
                size = item.stat().st_size
                mtime = item.stat().st_mtime
                btype = "file"
            elif item.is_file() and item.suffix == ".zst":
                manifest_path = mac_dir / f"{item.stem}.manifest.json"
                mode = "compressed"
                size = item.stat().st_size
                mtime = item.stat().st_mtime
                btype = "file"
            elif item.is_dir() and item.name.startswith("minimal_"):
                manifest_path = mac_dir / f"{item.name}.manifest.json"
                mode = "minimal"
                size = sum(f.stat().st_size for f in item.rglob("*") if f.is_file())
                mtime = item.stat().st_mtime
                btype = "dir"
            else:
                continue

            manifest = _read_manifest(manifest_path) if manifest_path.exists() else {}

            backups.append({
                "name":     item.name,
                "type":     btype,
                "mode":     mode,
                "size":     size,
                "mtime":    mtime,
                "manifest": manifest,
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


@router.delete("/server/backups/hot/{mac}/{name}")
async def delete_backup_hot(mac: str, name: str):
    """Remove um backup do hot cache."""
    mac_dir = HOT_CACHE_PATH / "forge" / mac
    item    = mac_dir / name

    if not item.exists():
        raise HTTPException(status_code=404, detail="Backup não encontrado")

    try:
        if item.is_dir():
            shutil.rmtree(item)
        else:
            item.unlink()

        # Remove manifest associado
        manifest = mac_dir / f"{name}.manifest.json"
        manifest.unlink(missing_ok=True)

        forge_log("system", f"backup removido: {mac}/{name}")
        return {"status": "ok", "deleted": name}
    except Exception as e:
        forge_log("error", f"erro ao remover backup {mac}/{name}: {e}")
        raise HTTPException(status_code=500, detail=str(e))