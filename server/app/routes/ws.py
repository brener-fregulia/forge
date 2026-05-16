"""Endpoints WebSocket — comunicação com agentes e dashboard."""
import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.state import state, Client
from app.db.base import AsyncSessionLocal
from app.db.services.machine import get_or_create_machine, update_machine_hardware
from app.db.models import Client as DBClient, Machine as DBMachine  # noqa

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

    async with AsyncSessionLocal() as db:
        machine = await get_or_create_machine(db, mac=mac)
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


@router.websocket("/ws/terminal/{mac}/{session_id}/{port}")
async def ws_terminal(websocket: WebSocket, mac: str, session_id: str, port: int):
    client = state.get_client(mac)
    if not client:
        await websocket.close(code=4004)
        return

    await websocket.accept()

    # Retry para aguardar o socat iniciar
    reader, writer = None, None
    for attempt in range(10):
        try:
            reader, writer = await asyncio.open_connection(client.ip, port)
            break
        except Exception as e:
            await asyncio.sleep(0.3)

    if not reader:
        await websocket.send_text(f"\r\nErro: não foi possível conectar ao terminal\r\n")
        await websocket.close()
        return

    async def ws_to_tcp():
        try:
            while True:
                msg = await websocket.receive()
                if msg["type"] == "websocket.disconnect":
                    break
                data = msg.get("bytes") or (msg.get("text", "").encode())
                if data:
                    writer.write(data)
                    await writer.drain()
        except Exception as e:
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