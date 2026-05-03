"""Endpoints WebSocket — comunicação com agentes e dashboard."""
import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.state import state, Client

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
        client.hostname = msg.get("hostname", client.hostname)
        client.hardware = msg.get("hardware", client.hardware) or client.hardware
        client.users    = msg.get("users", client.users)
        if msg_type == "inventory_base":
            client.status = "ready"
        else:
            client.disks  = msg.get("disks", [])
            client.smart  = _parse_smart(msg.get("smart"))
            client.status = "ready"
    elif msg_type == "inventory_disks":
        client.disks = msg.get("disks", [])
        client.smart = _parse_smart(msg.get("smart"))
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
    await state.broadcast_to_dashboard({"type": "client_connected", "client": client.to_dict()})

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
            except json.JSONDecodeError as e:
                client.log.append(f"[raw] {data[:200]}")
                continue

            _handle_message(client, msg)
            await state.broadcast_to_dashboard({
                "type": "client_update",
                "mac": mac,
                "client": client.to_dict(),
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