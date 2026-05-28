"""Endpoints REST - visualizacao de backups no storage."""
import json
import shutil
import asyncio
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
    

@router.post("/server/backups/hot/{mac}/{name}/compress")
async def compress_backup(mac: str, name: str):
    """Compacta backup do hot cache e replica para cold storage."""
    mac_dir  = HOT_CACHE_PATH / "forge" / mac
    item     = mac_dir / name

    if not item.exists():
        raise HTTPException(status_code=404, detail="Backup nao encontrado")

    if item.is_dir():
        # minimal - compacta o diretorio inteiro
        src = str(item)
        zst_path = mac_dir / f"{name}.tar.zst"
        cmd = ["tar", "-I", "zstd -T0", "-cf", str(zst_path), "-C", str(mac_dir), name]
    else:
        # raw - compacta o arquivo
        zst_path = mac_dir / f"{name}.zst"
        cmd = ["zstd", "-T0", "-o", str(zst_path), str(item)]

    forge_log("system", f"{mac} - compactando {name}...")

    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.DEVNULL,
        stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.wait()

    if not zst_path.exists():
        raise HTTPException(status_code=500, detail="Falha na compactacao")

    # Replica para cold storage
    cold_dir = COLD_STORAGE_PATH / "forge" / mac
    cold_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(zst_path, cold_dir / zst_path.name)

    # Copia manifest
    manifest_path = mac_dir / f"{name}.manifest.json"
    if manifest_path.exists():
        shutil.copy2(manifest_path, cold_dir / manifest_path.name)

    forge_log("system", f"{mac} - {name} compactado e replicado para cold storage")
    return {"status": "ok", "compressed": zst_path.name}