"""TCP receiver para stream de backup — porta temporária por job."""
import asyncio
import json
from pathlib import Path
from datetime import datetime
from app.forge_log import forge_log

RECEIVER_HOST = "0.0.0.0"
PORT_RANGE = (9100, 9199)  # uma porta por job simultâneo

_active_receivers: dict[int, asyncio.Server] = {}


def _backup_dir(mac: str) -> Path:
    from app.config import HOT_CACHE_PATH
    return HOT_CACHE_PATH / "forge" / mac.replace(":", "")


def _free_port() -> int | None:
    for port in range(*PORT_RANGE):
        if port not in _active_receivers:
            return port
    return None


async def open_receiver(mac: str, device: str, mode: str = "raw") -> dict:
    port = _free_port()
    if port is None:
        raise RuntimeError("Nenhuma porta disponível para backup")

    backup_dir = _backup_dir(mac)
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp  = datetime.now().strftime("%Y%m%d-%H%M%S")
    job_id     = f"{mac.replace(':', '')}_{timestamp}"

    if mode == "raw":
        part_path  = backup_dir / f"backup_{timestamp}.img.part"
        final_path = backup_dir / f"backup_{timestamp}.img"
        manifest_path = backup_dir / f"backup_{timestamp}.manifest.json"
    else:
        final_path = backup_dir / f"minimal_{timestamp}"
        part_path  = None
        manifest_path = backup_dir / f"minimal_{timestamp}.manifest.json"

    manifest = {
        "job_id":     job_id,
        "mac":        mac,
        "device":     device,
        "mode":       mode,
        "status":     "receiving",
        "started_at": datetime.now().isoformat(),
        "port":       port,
        "file":       str(final_path.name),
        "bytes":      0,
    }
    _write_manifest(manifest_path, manifest)
    forge_log("agent", f"{mac} - backup job {job_id} ({mode}) aberto na porta {port}")

    async def _handle(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
        forge_log("agent", f"{mac} - stream conectado na porta {port}")
        bytes_received = 0
        last_log = 0

        try:
            if mode == "raw":
                with open(part_path, "wb") as f:
                    while True:
                        chunk = await reader.read(65536)
                        if not chunk:
                            break
                        f.write(chunk)
                        bytes_received += len(chunk)
                        if bytes_received - last_log >= 500 * 1024 * 1024:
                            last_log = bytes_received
                            manifest["bytes"] = bytes_received
                            _write_manifest(manifest_path, manifest)
                            forge_log("agent", f"{mac} - backup em progresso: {bytes_received / 1024 / 1024 / 1024:.2f} GB")
                part_path.rename(final_path)
            else:
                # Modo minimal — recebe tar e extrai
                final_path.mkdir(parents=True, exist_ok=True)
                proc = await asyncio.create_subprocess_exec(
                    "tar", "-xf", "-", "-C", str(final_path),
                    stdin=asyncio.subprocess.PIPE,
                )
                while True:
                    chunk = await reader.read(65536)
                    if not chunk:
                        break
                    proc.stdin.write(chunk)
                    bytes_received += len(chunk)
                proc.stdin.close()
                await proc.wait()

        except Exception as e:
            forge_log("error", f"{mac} - erro no stream: {e}")
            manifest["status"] = "failed"
            _write_manifest(manifest_path, manifest)
            writer.close()
            return

        manifest["status"]      = "completed"
        manifest["bytes"]       = bytes_received
        manifest["finished_at"] = datetime.now().isoformat()
        _write_manifest(manifest_path, manifest)
        forge_log("agent", f"{mac} - backup concluido: {bytes_received / 1024 / 1024:.1f} MB")

        writer.close()
        server = _active_receivers.pop(port, None)
        if server:
            server.close()

    server = await asyncio.start_server(_handle, RECEIVER_HOST, port)
    _active_receivers[port] = server
    asyncio.create_task(server.serve_forever())

    return {"job_id": job_id, "port": port}


def _write_manifest(path: Path, manifest: dict):
    path.write_text(json.dumps(manifest, indent=2))