"""Endpoints WebSocket — comunicação com agentes e dashboard."""
import json
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.state import state, Client

router = APIRouter()


@router.websocket("/ws/agent/{mac}")
async def ws_agent(websocket: WebSocket, mac: str):
    """Endpoint para o FORGE Agent (Alpine cliente) se conectar."""
    await websocket.accept()
    ip = websocket.client.host if websocket.client else "unknown"

    client = Client(mac=mac, ip=ip, websocket=websocket)
    state.add_client(client)

    await state.broadcast_to_dashboard({
        "type": "client_connected",
        "client": client.to_dict(),
    })

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                print(f"[FORGE] msg de {mac}: type={msg.get('type')}")
            except json.JSONDecodeError as e:
                print(f"[FORGE] JSON inválido de {mac}: {e}")
                print(f"[FORGE] dados crus: {repr(data[:200])}")
                client.log.append(f"[raw] {data}")
                continue

            client.last_seen = datetime.now()
            msg_type = msg.get("type")

            # Atualiza estado conforme o tipo de mensagem
            if msg_type == "inventory":
                client.hostname = msg.get("hostname")
                client.hardware = msg.get("hardware", {})
                client.disks = msg.get("disks", [])
                client.users = msg.get("users", [])
                client.status = "ready"
            elif msg_type == "status":
                client.status = msg.get("status", client.status)
                client.progress = msg.get("progress", client.progress)
            elif msg_type == "log":
                client.log.append(msg.get("line", ""))
            elif msg_type == "command_output":
                client.log.append(f"[cmd] {msg.get('output', '')}")

            # Repassa para o dashboard em tempo real
            await state.broadcast_to_dashboard({
                "type": "client_update",
                "mac": mac,
                "client": client.to_dict(),
            })

    except WebSocketDisconnect:
        pass
    finally:
        state.remove_client(mac)
        await state.broadcast_to_dashboard({
            "type": "client_disconnected",
            "mac": mac,
        })


@router.websocket("/ws/dashboard")
async def ws_dashboard(websocket: WebSocket):
    """Endpoint para o navegador receber atualizações em tempo real."""
    await websocket.accept()
    state.dashboard_sockets.add(websocket)

    # Snapshot inicial
    await websocket.send_json({
        "type": "snapshot",
        "clients": [c.to_dict() for c in state.clients.values()],
    })

    try:
        while True:
            # Mantém conexão viva, ignora mensagens do navegador
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        state.dashboard_sockets.discard(websocket)
