"""Endpoints REST — clientes PXE."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.state import state

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