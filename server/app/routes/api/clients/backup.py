"""Endpoints REST — backup de clientes."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.state import state
from app.services.backup_receiver import open_receiver
from app.services.forge_log import forge_log
from app.config import SERVER_IP

router = APIRouter(tags=["backup"])


class BackupRequest(BaseModel):
    device: str  # ex: sda3


@router.post("/clients/{mac}/backup/start")
async def start_backup(mac: str, payload: BackupRequest):
    """Abre TCP receiver e envia comando ao agent para iniciar stream."""
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    try:
        job = await open_receiver(mac, payload.device)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    # Envia comando ao agent via WebSocket
    port = job["port"]
    cmd = (
        f"nohup sh -c 'ntfsclone -sO - /dev/{payload.device} 2>/dev/null | "
        f"$LIB/../bin/socat - TCP:{SERVER_IP}:{port}' "
        f"> /tmp/backup.log 2>&1 &"
    )

    try:
        await client.websocket.send_json({
            "type":    "command",
            "command": cmd,
        })
    except Exception as e:
        forge_log("error", f"{mac} - erro ao enviar comando de backup: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    client.status = "backup"
    await state.broadcast_to_dashboard({
        "type":   "client_update",
        "mac":    mac,
        "client": client.to_summary(),
    })

    forge_log("agent", f"{mac} - backup iniciado: /dev/{payload.device} -> porta {job['port']}")
    return {"status": "started", **job}


class MinimalBackupRequest(BaseModel):
    device: str
    users: list[str] = []  # vazio = todos os usuarios


@router.post("/clients/{mac}/backup/minimal/start")
async def start_minimal_backup(mac: str, payload: MinimalBackupRequest):
    """Abre TCP receiver e inicia backup mínimo no agent."""
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    try:
        job = await open_receiver(mac, payload.device, mode="minimal")
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    port = job["port"]
    cmd = (
        f"nohup sh -c '. $LIB/backup_minimal.sh && "
        f"backup_minimal {payload.device} {port} $MAC' "
        f"> /tmp/backup-minimal.log 2>&1 &"
    )

    try:
        await client.websocket.send_json({"type": "command", "command": cmd})
    except Exception as e:
        forge_log("error", f"{mac} - erro ao iniciar backup mínimo: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    client.status = "backup"
    await state.broadcast_to_dashboard({
        "type":   "client_update",
        "mac":    mac,
        "client": client.to_summary(),
    })

    forge_log("agent", f"{mac} - backup mínimo iniciado: /dev/{payload.device} -> porta {port}")
    return {"status": "started", **job}