"""Endpoints REST - máquinas PXE."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.state import state
from app.db.base import AsyncSessionLocal

router = APIRouter(tags=["machines"])


@router.get("/clients")
async def list_clients():
    return [c.to_summary() for c in state.clients.values()]


@router.get("/clients/{mac}")
async def get_client(mac: str):
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return client.to_dict()


class AliasRequest(BaseModel):
    alias: str


@router.post("/clients/{mac}/alias")
async def set_alias(mac: str, payload: AliasRequest):
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    client.alias = payload.alias.strip()

    async with AsyncSessionLocal() as db:
        from app.db.services.machine import set_machine_alias
        await set_machine_alias(db, mac=mac, alias=client.alias)

    await state.broadcast_to_dashboard({
        "type": "client_update",
        "mac":mac,
        "client": client.to_summary(),
    })

    return {"status": "ok", "alias": client.alias}