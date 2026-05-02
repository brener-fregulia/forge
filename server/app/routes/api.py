"""Endpoints REST."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.state import state

router = APIRouter()


class CommandRequest(BaseModel):
    command: str


@router.get("/clients")
async def list_clients():
    """Lista todos os clientes conectados."""
    return [c.to_dict() for c in state.clients.values()]


@router.get("/clients/{mac}")
async def get_client(mac: str):
    """Detalhes de um cliente."""
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return client.to_dict()


@router.post("/clients/{mac}/command")
async def send_command(mac: str, payload: CommandRequest):
    """Envia um comando shell para o cliente executar."""
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    try:
        await client.websocket.send_json({
            "type": "command",
            "command": payload.command,
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao enviar: {e}")

    return {"status": "sent", "command": payload.command}