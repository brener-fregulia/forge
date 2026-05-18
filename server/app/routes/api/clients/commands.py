"""Endpoints REST — comandos ao agent."""
import asyncio
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.state import state
from app.forge_log import forge_log

router = APIRouter(tags=["commands"])


class CommandRequest(BaseModel):
    command: str


@router.post("/clients/{mac}/command")
async def send_command(mac: str, payload: CommandRequest):
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    try:
        await client.websocket.send_json({"type": "command", "command": payload.command})
        forge_log("agent", f"{mac} - comando enviado: {payload.command[:80]}")
    except Exception as e:
        forge_log("error", f"{mac} - erro ao enviar comando: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao enviar: {e}")
    return {"status": "sent", "command": payload.command}


@router.post("/clients/{mac}/command/exec")
async def exec_command(mac: str, payload: CommandRequest):
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404)

    cmd_id = str(uuid.uuid4())
    loop   = asyncio.get_event_loop()
    future = loop.create_future()
    client.pending_commands[cmd_id] = future

    try:
        await client.websocket.send_json({
            "type":    "command",
            "command": payload.command,
            "id":      cmd_id,
        })
        forge_log("agent", f"{mac} - exec: {payload.command[:80]}")
    except Exception as e:
        del client.pending_commands[cmd_id]
        forge_log("error", f"{mac} - erro ao executar comando: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao enviar: {e}")

    try:
        output = await asyncio.wait_for(future, timeout=30.0)
    except asyncio.TimeoutError:
        forge_log("agent", f"{mac} - timeout no comando: {payload.command[:80]}")
        output = ""
    finally:
        client.pending_commands.pop(cmd_id, None)

    return {"output": output}


@router.post("/clients/{mac}/command/result")
async def command_result(mac: str, payload: dict):
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404)

    cmd_id = payload.get("id")
    output = payload.get("output", "")

    client.log.append(f"[cmd] {output}")
    await state.broadcast_to_dashboard({
        "type":   "client_update",
        "mac":    mac,
        "client": client.to_dict(),
    })

    future = client.pending_commands.get(cmd_id)
    if future and not future.done():
        future.set_result(output)

    return {"status": "ok"}


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