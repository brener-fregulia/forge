"""Endpoints REST — clientes PXE."""
import asyncio
import random
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.state import state
from app.db.base import AsyncSessionLocal

router = APIRouter(tags=["clients"])


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
    except Exception as e:
        del client.pending_commands[cmd_id]
        raise HTTPException(status_code=500, detail=f"Erro ao enviar: {e}")

    try:
        output = await asyncio.wait_for(future, timeout=30.0)
    except asyncio.TimeoutError:
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
        "mac": mac,
        "client": client.to_dict(),
    })

    return {"status": "ok", "alias": client.alias}


class DeployPlan(BaseModel):
    target_disk: str
    backup: bool = True
    backup_users: list[str] = []
    backup_root: bool = False
    windows_iso: str | None = None
    drivers: bool = True
    debloat: bool = True
    restore: bool = True


@router.post("/clients/{mac}/deploy/plan")
async def create_deploy_plan(mac: str, plan: DeployPlan):
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")

    client.deploy_plan = plan.model_dump()
    client.status = "ready"

    await state.broadcast_to_dashboard({
        "type": "client_update",
        "mac": mac,
        "client": client.to_dict(),
    })

    return {"status": "ok", "plan": client.deploy_plan}


@router.post("/clients/{mac}/terminal/open")
async def open_terminal(mac: str):
    client = state.get_client(mac)
    if not client:
        raise HTTPException(status_code=404)

    port = random.randint(7600, 7699)
    cmd = (
        f"nohup sh -c 'LD_LIBRARY_PATH=$LIB/../bin "
        f"$LIB/../bin/socat "
        f"TCP4-LISTEN:{port},reuseaddr "
        f"EXEC:/bin/sh,pty,setsid,ctty,stderr' "
        f"> /tmp/socat-{port}.log 2>&1 &"
    )

    try:
        await client.websocket.send_json({"type": "command", "command": cmd})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    await asyncio.sleep(0.8)
    return {"port": port, "ip": client.ip}