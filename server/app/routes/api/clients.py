"""Endpoints REST — clientes PXE."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.state import state
from app.db.base import AsyncSessionLocal

router = APIRouter()


class CommandRequest(BaseModel):
    command: str


@router.get("/clients")
async def list_clients():
    return [c.to_dict() for c in state.clients.values()]


@router.get("/clients/{mac}")
async def get_client(mac: str):
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return client.to_dict()


@router.post("/clients/{mac}/command")
async def send_command(mac: str, payload: CommandRequest):
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    try:
        await client.websocket.send_json({"type": "command", "command": payload.command})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar: {e}")
    return {"status": "sent", "command": payload.command}


@router.post("/clients/{mac}/log/clear")
async def clear_log(mac: str):
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    client.log = []
    await state.broadcast_to_dashboard({
        "type": "client_update",
        "mac": mac,
        "client": client.to_dict(),
    })
    return {"status": "cleared"}

class AliasRequest(BaseModel):
    alias: str


@router.post("/clients/{mac}/alias")
async def set_alias(mac: str, payload: AliasRequest):
    """Define alias para uma máquina."""
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    # Salva no estado em memória
    client.alias = payload.alias.strip()

    # Persiste no banco
    async with AsyncSessionLocal() as db:
        from app.db.services.machine import set_machine_alias
        await set_machine_alias(db, mac=mac, alias=client.alias)

    # Propaga para o dashboard
    await state.broadcast_to_dashboard({
        "type": "client_update",
        "mac": mac,
        "client": client.to_dict(),
    })

    return {"status": "ok", "alias": client.alias}