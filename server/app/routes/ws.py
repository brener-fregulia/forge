"""Endpoints WebSocket — comunicação com agentes e dashboard."""
import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.state import state, Client
from app.db.base import AsyncSessionLocal
from app.db.services.machine import get_or_create_machine, update_machine_hardware
from app.db.models import Client as DBClient, Machine as DBMachine  # noqa — garante init dos models
import asyncio, random

router = APIRouter()


def _parse_smart(smart_raw: dict) -> dict:
    parsed = {}
    for disk, data in (smart_raw or {}).items():
        if isinstance(data, str):
            try:
                parsed[disk] = json.loads(data)
            except json.JSONDecodeError:
                parsed[disk] = {"error": "parse_failed"}
        else:
            parsed[disk] = data
    return parsed


def _handle_message(client: Client, msg: dict) -> None:
    msg_type = msg.get("type")
    client.last_seen = datetime.now()

    if msg_type in ("inventory", "inventory_base"):
        client.hostname = msg.get("hostname") or client.hostname
        hw = msg.get("hardware")
        if hw:
            client.hardware = hw
        client.users = msg.get("users") or client.users
        if msg_type == "inventory_base":
            client.status = "ready"
        else:
            client.disks = msg.get("disks", [])
            client.smart = _parse_smart(msg.get("smart"))
            client.status = "ready"
    elif msg_type == "inventory_disks":
        client.disks = msg.get("disks", [])
        client.smart = _parse_smart(msg.get("smart"))
        client.users = msg.get("users") or client.users
        client.drive_letters = msg.get("drive_letters", [])
    elif msg_type == "status":
        client.status   = msg.get("status", client.status)
        client.progress = msg.get("progress", client.progress)
    elif msg_type == "log":
        client.log.append(msg.get("line", ""))
    elif msg_type == "command_output":
        client.log.append(f"[cmd] {msg.get('output', '')}")


@router.websocket("/ws/agent/{mac}")
async def ws_agent(websocket: WebSocket, mac: str):
    await websocket.accept()
    ip = websocket.client.host if websocket.client else "unknown"

    client = Client(mac=mac, ip=ip, websocket=websocket)
    state.add_client(client)

    # Registra ou atualiza máquina no banco
    async with AsyncSessionLocal() as db:
        machine = await get_or_create_machine(db, mac=mac)
        # Carrega alias salvo no banco para o estado em memória
        if machine.alias:
            client.alias = machine.alias

    await state.broadcast_to_dashboard({"type": "client_connected", "client": client.to_dict()})

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError:
                client.log.append(f"[raw] {data[:200]}")
                continue

            _handle_message(client, msg)

            # Persiste hardware quando inventário base chega
            msg_type = msg.get("type")
            if msg_type == "inventory_base" and msg.get("hardware"):
                async with AsyncSessionLocal() as db:
                    await update_machine_hardware(db, mac=mac, hardware=msg["hardware"])
                    await get_or_create_machine(db, mac=mac, hostname=msg.get("hostname"))

            if msg_type in ("inventory_base", "inventory_disks", "status"):
                await websocket.send_json({"type": "ack"})

            if msg_type != "status":
                await state.broadcast_to_dashboard({
                    "type": "client_update",
                    "mac": mac,
                    "client": client.to_dict(),
                })
            else:
                await state.broadcast_to_dashboard({
                    "type": "client_status",
                    "mac": mac,
                    "status": client.status,
                    "progress": client.progress,
                    "last_seen": client.last_seen.isoformat(),
                })

    except WebSocketDisconnect:
        pass
    finally:
        state.remove_client(mac)
        await state.broadcast_to_dashboard({"type": "client_disconnected", "mac": mac})


@router.websocket("/ws/dashboard")
async def ws_dashboard(websocket: WebSocket):
    await websocket.accept()
    state.dashboard_sockets.add(websocket)
    await websocket.send_json({
        "type": "snapshot",
        "clients": [c.to_dict() for c in state.clients.values()],
    })
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        state.dashboard_sockets.discard(websocket)


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


@router.websocket("/ws/terminal/{mac}/{session_id}")
async def ws_terminal(websocket: WebSocket, mac: str, session_id: str):
    client = state.get_client(mac)
    if not client:
        await websocket.close(code=4004)
        return

    await websocket.accept()

    # Abre sessão PTY no agent
    port = random.randint(7600, 7699)
    cmd = (
        f"nohup sh -c 'LD_LIBRARY_PATH=$LIB/../bin "
        f"$LIB/../bin/socat "
        f"PTY,raw,echo=0 "
        f"TCP-LISTEN:{port},reuseaddr' "
        f"> /tmp/socat-{port}.log 2>&1 &"
    )
    await client.websocket.send_json({"type": "command", "command": cmd})
    await asyncio.sleep(0.8)

    # Conecta ao PTY via TCP
    try:
        reader, writer = await asyncio.open_connection(client.ip, port)
    except Exception as e:
        await websocket.send_text(f"\r\nErro ao conectar ao terminal: {e}\r\n")
        await websocket.close()
        return

    async def ws_to_tcp():
        try:
            while True:
                data = await websocket.receive_bytes()
                writer.write(data)
                await writer.drain()
        except Exception:
            pass

    async def tcp_to_ws():
        try:
            while True:
                data = await reader.read(1024)
                if not data:
                    break
                await websocket.send_bytes(data)
        except Exception:
            pass

    await asyncio.gather(ws_to_tcp(), tcp_to_ws())
    writer.close()


